import * as core from '@actions/core'
import * as github from '@actions/github'
import fs from 'fs'
import path from 'path'
import {CoverageReport} from './Model/CoverageReport'
import {DiffChecker} from './DiffChecker'
import {Octokit} from '@octokit/core'
import {PaginateInterface} from '@octokit/plugin-paginate-rest'
import {RestEndpointMethods} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types'

interface ProjectComparison {
  projectPath: string
  diffChecker: DiffChecker
  isNew: boolean
  newCoverage: CoverageReport
  oldCoverage: CoverageReport
}

/**
 * Find all coverage-summary.json files in a directory
 * Returns array of {relativePath, fullPath} objects
 */
function findCoverageSummaryFiles(
  baseDir: string
): {relativePath: string; fullPath: string}[] {
  const results: {relativePath: string; fullPath: string}[] = []

  function searchDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      return
    }

    const entries = fs.readdirSync(dir, {withFileTypes: true})

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        searchDirectory(fullPath)
      } else if (entry.name === 'coverage-summary.json') {
        const relativePath = path.relative(baseDir, path.dirname(fullPath))
        results.push({relativePath, fullPath})
      }
    }
  }

  searchDirectory(baseDir)
  return results
}

/**
 * Normalize file paths in coverage report to be relative to the project path
 * This handles cases where coverage was generated on different machines with different absolute paths
 *
 * Strategy: Look for the project path pattern in the absolute path and extract everything from that point
 * Example: If coverage file is at "coverage/apps/backend/service/coverage-summary.json"
 * - projectRelativePath = "apps/backend/service"
 * - Absolute path = "/Users/me/project/apps/backend/service/src/file.ts"
 * - Normalized = "apps/backend/service/src/file.ts"
 */
function normalizeCoveragePaths(
  coverageReport: CoverageReport,
  projectRelativePath: string
): CoverageReport {
  const normalized: CoverageReport = {}

  // Keep the total entry as-is
  if (coverageReport.total) {
    normalized.total = coverageReport.total
  }

  // Split the project path into parts for matching
  const projectParts = projectRelativePath.split(path.sep).filter(p => p)

  // Process each file entry
  for (const [filePath, coverage] of Object.entries(coverageReport)) {
    if (filePath === 'total') {
      continue
    }

    let normalizedPath = filePath

    // Use both forward slash and backslash to handle cross-platform paths
    const pathParts = filePath.split(/[/\\]/).filter(p => p)

    // Look for the deepest match of project parts in the file path
    // We search from the end backwards to get the longest match
    let bestMatchIndex = -1
    let bestMatchLength = 0

    for (let i = pathParts.length - projectParts.length; i >= 0; i--) {
      let matchLength = 0
      for (
        let j = 0;
        j < projectParts.length && i + j < pathParts.length;
        j++
      ) {
        if (pathParts[i + j] === projectParts[j]) {
          matchLength++
        } else {
          break
        }
      }

      if (matchLength > bestMatchLength) {
        bestMatchLength = matchLength
        bestMatchIndex = i
      }

      // If we found a complete match, use it
      if (matchLength === projectParts.length) {
        break
      }
    }

    // If we found at least a partial match, construct the normalized path
    if (bestMatchIndex >= 0 && bestMatchLength > 0) {
      // Include the matched parts and everything after
      const normalizedParts = pathParts.slice(bestMatchIndex)
      normalizedPath = normalizedParts.join('/')
    } else {
      // No match found, keep the original path (will likely appear as new/deleted)
      core.info(
        `Could not normalize path ${filePath} for project ${projectRelativePath}`
      )
    }

    normalized[normalizedPath] = coverage
  }

  return normalized
}

/**
 * Compare coverage files between new and old paths using DiffChecker
 */
function compareAllCoverageFiles(
  newCoveragePath: string,
  oldCoveragePath: string
): ProjectComparison[] {
  const newCoverageFiles = findCoverageSummaryFiles(newCoveragePath)
  const comparisons: ProjectComparison[] = []

  for (const newFile of newCoverageFiles) {
    const oldFilePath = path.join(
      oldCoveragePath,
      newFile.relativePath,
      'coverage-summary.json'
    )

    try {
      const newCoverageRaw: CoverageReport = JSON.parse(
        fs.readFileSync(newFile.fullPath, 'utf8')
      )

      // Normalize the new coverage paths
      const newCoverage = normalizeCoveragePaths(
        newCoverageRaw,
        newFile.relativePath
      )

      let oldCoverage: CoverageReport
      let isNew = false

      if (fs.existsSync(oldFilePath)) {
        const oldCoverageRaw: CoverageReport = JSON.parse(
          fs.readFileSync(oldFilePath, 'utf8')
        )
        // Normalize the old coverage paths
        oldCoverage = normalizeCoveragePaths(
          oldCoverageRaw,
          newFile.relativePath
        )
      } else {
        // No old coverage found - this is a new project
        core.info(`New project found: ${newFile.relativePath}`)
        oldCoverage = {total: newCoverage.total} // Empty old coverage
        isNew = true
      }

      const diffChecker = new DiffChecker(
        newCoverage,
        oldCoverage,
        newFile.relativePath
      )
      comparisons.push({
        projectPath: newFile.relativePath,
        diffChecker,
        isNew,
        newCoverage,
        oldCoverage
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      core.warning(
        `Failed to process coverage files for ${newFile.relativePath}: ${errorMsg}`
      )
    }
  }

  return comparisons
}

/**
 * Calculate weighted overall coverage change across all projects
 */
function calculateWeightedCoverageChange(
  comparisons: ProjectComparison[]
): {
  statements: {pct: number; diff: number}
  branches: {pct: number; diff: number}
  functions: {pct: number; diff: number}
  lines: {pct: number; diff: number}
  hasData: boolean
} {
  const baselineStatements = {total: 0, covered: 0}
  const baselineBranches = {total: 0, covered: 0}
  const baselineFunctions = {total: 0, covered: 0}
  const baselineLines = {total: 0, covered: 0}

  const currentStatements = {total: 0, covered: 0}
  const currentBranches = {total: 0, covered: 0}
  const currentFunctions = {total: 0, covered: 0}
  const currentLines = {total: 0, covered: 0}

  for (const comparison of comparisons) {
    if (comparison.isNew) {
      continue // Skip new projects for baseline calculation
    }

    const oldTotal = comparison.oldCoverage.total
    const newTotal = comparison.newCoverage.total

    if (!oldTotal || !newTotal) {
      continue
    }

    // Aggregate baseline (old) coverage
    baselineStatements.total += oldTotal.statements.total
    baselineStatements.covered += oldTotal.statements.covered
    baselineBranches.total += oldTotal.branches.total
    baselineBranches.covered += oldTotal.branches.covered
    baselineFunctions.total += oldTotal.functions.total
    baselineFunctions.covered += oldTotal.functions.covered
    baselineLines.total += oldTotal.lines.total
    baselineLines.covered += oldTotal.lines.covered

    // Aggregate current (new) coverage
    currentStatements.total += newTotal.statements.total
    currentStatements.covered += newTotal.statements.covered
    currentBranches.total += newTotal.branches.total
    currentBranches.covered += newTotal.branches.covered
    currentFunctions.total += newTotal.functions.total
    currentFunctions.covered += newTotal.functions.covered
    currentLines.total += newTotal.lines.total
    currentLines.covered += newTotal.lines.covered
  }

  // Calculate percentages and diffs
  const calcPct = (covered: number, total: number): number => {
    if (total === 0) return 0
    return Math.round((covered / total) * 10000) / 100
  }

  const baselineStatementsPct = calcPct(
    baselineStatements.covered,
    baselineStatements.total
  )
  const currentStatementsPct = calcPct(
    currentStatements.covered,
    currentStatements.total
  )

  const baselineBranchesPct = calcPct(
    baselineBranches.covered,
    baselineBranches.total
  )
  const currentBranchesPct = calcPct(
    currentBranches.covered,
    currentBranches.total
  )

  const baselineFunctionsPct = calcPct(
    baselineFunctions.covered,
    baselineFunctions.total
  )
  const currentFunctionsPct = calcPct(
    currentFunctions.covered,
    currentFunctions.total
  )

  const baselineLinesPct = calcPct(baselineLines.covered, baselineLines.total)
  const currentLinesPct = calcPct(currentLines.covered, currentLines.total)

  const roundDiff = (diff: number): number =>
    Math.round((diff + Number.EPSILON) * 100) / 100

  return {
    statements: {
      pct: currentStatementsPct,
      diff: roundDiff(currentStatementsPct - baselineStatementsPct)
    },
    branches: {
      pct: currentBranchesPct,
      diff: roundDiff(currentBranchesPct - baselineBranchesPct)
    },
    functions: {
      pct: currentFunctionsPct,
      diff: roundDiff(currentFunctionsPct - baselineFunctionsPct)
    },
    lines: {
      pct: currentLinesPct,
      diff: roundDiff(currentLinesPct - baselineLinesPct)
    },
    hasData:
      baselineStatements.total > 0 ||
      baselineBranches.total > 0 ||
      baselineFunctions.total > 0 ||
      baselineLines.total > 0
  }
}

/**
 * Format the coverage comparison comment with collapsed sections for each project
 */
function formatCoverageComment(
  comparisons: ProjectComparison[],
  commitSha: string,
  baseSha: string | undefined,
  customComment?: string
): string {
  if (comparisons.length === 0) {
    return '<!-- coverage-comparison -->\n## 📊 Coverage Report\n\nNo coverage data found.'
  }

  let comment = '<!-- coverage-comparison -->\n'

  // Add custom comment at the top if provided
  if (customComment) {
    comment += `${customComment}\n\n`
  }

  comment += '## 📊 Coverage Report\n\n'

  // Filter out projects with no changes (only show projects with actual coverage differences)
  const projectsWithChanges = comparisons.filter(comparison => {
    const coverageDetails = comparison.diffChecker.getCoverageDetails(true, '')
    return comparison.isNew || coverageDetails.length > 0
  })

  if (projectsWithChanges.length === 0) {
    comment += 'No changes to code coverage.\n\n'
  } else {
    comment += `Found ${projectsWithChanges.length} project(s) with coverage changes.\n\n`

    // Calculate weighted overall coverage change across ALL projects (not just ones with changes)
    const weightedCoverage = calculateWeightedCoverageChange(comparisons)

    if (weightedCoverage.hasData) {
      // Add summary table showing weighted overall coverage change
      comment += '### Overall Coverage Change\n\n'
      comment +=
        '| Status | Metric | Statements % | Branches % | Functions % | Lines % |\n'
      comment +=
        '|--------|--------|--------------|------------|-------------|----------|\n'

      // Determine overall status icon
      const overallDiff =
        weightedCoverage.statements.diff +
        weightedCoverage.branches.diff +
        weightedCoverage.functions.diff +
        weightedCoverage.lines.diff
      const statusIcon = overallDiff < 0 ? ':red_circle:' : ':green_circle:'

      const formatDiff = (diff: number): string => {
        return diff >= 0 ? `(+${diff})` : `(${diff})`
      }

      comment += `| ${statusIcon} | **Total** | ${
        weightedCoverage.statements.pct
      } **${formatDiff(weightedCoverage.statements.diff)}** | ${
        weightedCoverage.branches.pct
      } **${formatDiff(weightedCoverage.branches.diff)}** | ${
        weightedCoverage.functions.pct
      } **${formatDiff(weightedCoverage.functions.diff)}** | ${
        weightedCoverage.lines.pct
      } **${formatDiff(weightedCoverage.lines.diff)}** |\n`

      comment += '\n---\n\n'
    }

    // Add collapsed section for each project with changes
    for (const comparison of projectsWithChanges) {
      const projectName = comparison.projectPath || 'root'
      const coverageDetails = comparison.diffChecker.getCoverageDetails(
        true,
        ''
      )

      if (comparison.isNew) {
        comment += `<details>\n`
        comment += `<summary>📦 ${projectName} (🆕 New Project)</summary>\n\n`
      } else {
        comment += `<details>\n`
        comment += `<summary>📦 ${projectName}</summary>\n\n`
      }

      comment +=
        '| Status | File | Statements % | Branches % | Functions % | Lines % |\n'
      comment +=
        '|--------|------|--------------|------------|-------------|----------|\n'

      if (coverageDetails.length > 0) {
        comment += `${coverageDetails.join('\n')}\n`
      } else {
        comment += '*No changes detected*\n'
      }

      comment += '\n</details>\n\n'
    }
  }

  comment += `\n**Baseline:** \`${baseSha || 'unknown'}\`\n`
  comment += `**Current:** \`${commitSha}\`\n\n`
  comment += '---\n\n'
  comment +=
    '*This comment is automatically updated with the latest coverage data.*\n'

  return comment
}

async function run(): Promise<void> {
  try {
    const repoName = github.context.repo.repo
    const repoOwner = github.context.repo.owner
    const commitSha = github.context.sha
    const githubToken = core.getInput('accessToken')
    const delta = Number(core.getInput('delta'))
    const rawTotalDelta = core.getInput('total_delta')
    const newCoveragePath = core.getInput('newCoveragePath')
    const oldCoveragePath = core.getInput('oldCoveragePath')
    const githubClient = github.getOctokit(githubToken)
    const prNumber = github.context.issue.number
    const useSameComment = JSON.parse(core.getInput('useSameComment'))
    const customComment = core.getInput('comment') || undefined
    const commentIdentifier = `<!-- coverage-comparison -->`
    let totalDelta = null
    if (rawTotalDelta !== null && rawTotalDelta !== '') {
      totalDelta = Number(rawTotalDelta)
    }
    let commentId = null

    // Compare all coverage files using DiffChecker
    const comparisons = compareAllCoverageFiles(
      newCoveragePath,
      oldCoveragePath
    )

    core.info(`Found ${comparisons.length} projects with coverage data`)

    const baseSha = github.context.payload.pull_request?.base.sha

    // Generate the comment
    const messageToPost = formatCoverageComment(
      comparisons,
      commitSha,
      baseSha,
      customComment
    )

    // Post or update the comment
    if (useSameComment) {
      commentId = await findComment(
        githubClient,
        repoName,
        repoOwner,
        prNumber,
        commentIdentifier
      )
    }

    await createOrUpdateComment(
      commentId,
      githubClient,
      repoOwner,
      repoName,
      messageToPost,
      prNumber
    )

    // Check if any project's coverage falls below delta threshold
    for (const comparison of comparisons) {
      if (!comparison.isNew) {
        if (
          comparison.diffChecker.checkIfTestCoverageFallsBelowDelta(
            delta,
            totalDelta
          )
        ) {
          const totalDeltaMsg =
            totalDelta !== null ? `, total_delta: ${totalDelta}%` : ''
          const errorMessage = `Project ${comparison.projectPath} coverage reduced below threshold (delta: ${delta}%${totalDeltaMsg})`
          core.setFailed(errorMessage)
          return
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(String(error))
    }
  }
}

async function createOrUpdateComment(
  commentId: number | null,
  githubClient: {
    [x: string]: string | number | boolean
  } & {
    [x: string]: string | number | boolean
  } & Octokit &
    RestEndpointMethods & {paginate: PaginateInterface},
  repoOwner: string,
  repoName: string,
  messageToPost: string,
  prNumber: number
): Promise<void> {
  if (commentId) {
    await githubClient.issues.updateComment({
      owner: repoOwner,
      repo: repoName,
      comment_id: commentId,
      body: messageToPost
    })
  } else {
    await githubClient.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      body: messageToPost,
      issue_number: prNumber
    })
  }
}

async function findComment(
  githubClient: {[x: string]: any} & {[x: string]: any} & Octokit &
    RestEndpointMethods & {paginate: PaginateInterface},
  repoName: string,
  repoOwner: string,
  prNumber: number,
  identifier: string
): Promise<number> {
  const comments = await githubClient.issues.listComments({
    owner: repoOwner,
    repo: repoName,
    issue_number: prNumber
  })

  for (const comment of comments.data) {
    if (comment.body.startsWith(identifier)) {
      return comment.id
    }
  }
  return 0
}

run()
