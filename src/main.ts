import * as core from '@actions/core'
import * as github from '@actions/github'
import fs from 'fs'
import path from 'path'
import {CoverageReport} from './Model/CoverageReport'
import {DiffChecker} from './DiffChecker'
import {Octokit} from '@octokit/core'
import {PaginateInterface} from '@octokit/plugin-paginate-rest'
import {RestEndpointMethods} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types'

interface ProjectCoverage {
  projectPath: string
  coverage: CoverageReport
}

interface CoverageMetrics {
  lines: {total: number; covered: number; skipped: number; pct: number}
  statements: {total: number; covered: number; skipped: number; pct: number}
  functions: {total: number; covered: number; skipped: number; pct: number}
  branches: {total: number; covered: number; skipped: number; pct: number}
}

function normalizePct(pct: number | string | undefined): number {
  // Handle "Unknown" string values from coverage reports (when total is 0)
  return typeof pct === 'number' ? pct : 0
}

interface RawCoverageMetrics {
  lines: {
    total: number
    covered: number
    skipped: number
    pct: number | string
  }
  statements: {
    total: number
    covered: number
    skipped: number
    pct: number | string
  }
  functions: {
    total: number
    covered: number
    skipped: number
    pct: number | string
  }
  branches: {
    total: number
    covered: number
    skipped: number
    pct: number | string
  }
}

function normalizeCoverageMetrics(
  metrics: RawCoverageMetrics
): CoverageMetrics {
  // Normalize coverage metrics to ensure pct values are numbers, not "Unknown" strings
  return {
    lines: {
      total: metrics.lines.total,
      covered: metrics.lines.covered,
      skipped: metrics.lines.skipped,
      pct: normalizePct(metrics.lines.pct)
    },
    statements: {
      total: metrics.statements.total,
      covered: metrics.statements.covered,
      skipped: metrics.statements.skipped,
      pct: normalizePct(metrics.statements.pct)
    },
    functions: {
      total: metrics.functions.total,
      covered: metrics.functions.covered,
      skipped: metrics.functions.skipped,
      pct: normalizePct(metrics.functions.pct)
    },
    branches: {
      total: metrics.branches.total,
      covered: metrics.branches.covered,
      skipped: metrics.branches.skipped,
      pct: normalizePct(metrics.branches.pct)
    }
  }
}

interface ProjectDiff {
  projectName: string
  projectPath: string
  before: CoverageMetrics
  after: CoverageMetrics
  isNew: boolean
  hasChanges: boolean
  diffChecker: DiffChecker | null
}

/**
 * Transforms coverage report keys to use the project path as the base
 * For example, if projectPath is "apps/backend/liquidity-service":
 * - Input key: "/home/runner/work/grain/grain/apps/backend/liquidity-service/src/app/forwards/service.ts"
 * - Output key: "apps/backend/liquidity-service/src/app/forwards/service.ts"
 */
function normalizeCoverageKeys(
  coverage: CoverageReport,
  projectPath: string
): CoverageReport {
  const normalized: CoverageReport = {}

  for (const [key, value] of Object.entries(coverage)) {
    // Keep 'total' as is
    if (key === 'total') {
      normalized[key] = value
      continue
    }

    // Find the projectPath in the key and extract from that point
    const index = key.indexOf(projectPath)
    if (index !== -1) {
      // Use the path starting from projectPath
      const normalizedKey = key.substring(index)
      normalized[normalizedKey] = value
    } else {
      // If projectPath not found, keep original key
      normalized[key] = value
    }
  }

  return normalized
}

function findCoverageSummaryFiles(baseDir: string): ProjectCoverage[] {
  const results: ProjectCoverage[] = []

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
        try {
          const rawCoverage = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
          const relativePath = path.relative(baseDir, path.dirname(fullPath))

          // Normalize the coverage keys to use the project path from the directory structure
          const normalizedCoverage = normalizeCoverageKeys(
            rawCoverage,
            relativePath
          )

          results.push({
            projectPath: relativePath,
            coverage: normalizedCoverage
          })
        } catch (error) {
          core.warning(`Failed to read coverage file: ${fullPath}`)
        }
      }
    }
  }

  searchDirectory(baseDir)
  return results
}

function calculateWeightedTotals(
  projects: ProjectDiff[]
): {before: CoverageMetrics; after: CoverageMetrics} {
  const beforeTotals = {
    lines: {total: 0, covered: 0, skipped: 0},
    statements: {total: 0, covered: 0, skipped: 0},
    functions: {total: 0, covered: 0, skipped: 0},
    branches: {total: 0, covered: 0, skipped: 0}
  }

  const afterTotals = {
    lines: {total: 0, covered: 0, skipped: 0},
    statements: {total: 0, covered: 0, skipped: 0},
    functions: {total: 0, covered: 0, skipped: 0},
    branches: {total: 0, covered: 0, skipped: 0}
  }

  for (const project of projects) {
    if (!project.isNew) {
      beforeTotals.lines.total += project.before.lines.total
      beforeTotals.lines.covered += project.before.lines.covered
      beforeTotals.lines.skipped += project.before.lines.skipped
      beforeTotals.statements.total += project.before.statements.total
      beforeTotals.statements.covered += project.before.statements.covered
      beforeTotals.statements.skipped += project.before.statements.skipped
      beforeTotals.functions.total += project.before.functions.total
      beforeTotals.functions.covered += project.before.functions.covered
      beforeTotals.functions.skipped += project.before.functions.skipped
      beforeTotals.branches.total += project.before.branches.total
      beforeTotals.branches.covered += project.before.branches.covered
      beforeTotals.branches.skipped += project.before.branches.skipped
    }

    afterTotals.lines.total += project.after.lines.total
    afterTotals.lines.covered += project.after.lines.covered
    afterTotals.lines.skipped += project.after.lines.skipped
    afterTotals.statements.total += project.after.statements.total
    afterTotals.statements.covered += project.after.statements.covered
    afterTotals.statements.skipped += project.after.statements.skipped
    afterTotals.functions.total += project.after.functions.total
    afterTotals.functions.covered += project.after.functions.covered
    afterTotals.functions.skipped += project.after.functions.skipped
    afterTotals.branches.total += project.after.branches.total
    afterTotals.branches.covered += project.after.branches.covered
    afterTotals.branches.skipped += project.after.branches.skipped
  }

  return {
    before: {
      lines: {
        total: beforeTotals.lines.total,
        covered: beforeTotals.lines.covered,
        skipped: beforeTotals.lines.skipped,
        pct:
          beforeTotals.lines.total - beforeTotals.lines.skipped > 0
            ? (beforeTotals.lines.covered /
                (beforeTotals.lines.total - beforeTotals.lines.skipped)) *
              100
            : 0
      },
      statements: {
        total: beforeTotals.statements.total,
        covered: beforeTotals.statements.covered,
        skipped: beforeTotals.statements.skipped,
        pct:
          beforeTotals.statements.total - beforeTotals.statements.skipped > 0
            ? (beforeTotals.statements.covered /
                (beforeTotals.statements.total -
                  beforeTotals.statements.skipped)) *
              100
            : 0
      },
      functions: {
        total: beforeTotals.functions.total,
        covered: beforeTotals.functions.covered,
        skipped: beforeTotals.functions.skipped,
        pct:
          beforeTotals.functions.total - beforeTotals.functions.skipped > 0
            ? (beforeTotals.functions.covered /
                (beforeTotals.functions.total -
                  beforeTotals.functions.skipped)) *
              100
            : 0
      },
      branches: {
        total: beforeTotals.branches.total,
        covered: beforeTotals.branches.covered,
        skipped: beforeTotals.branches.skipped,
        pct:
          beforeTotals.branches.total - beforeTotals.branches.skipped > 0
            ? (beforeTotals.branches.covered /
                (beforeTotals.branches.total - beforeTotals.branches.skipped)) *
              100
            : 0
      }
    },
    after: {
      lines: {
        total: afterTotals.lines.total,
        covered: afterTotals.lines.covered,
        skipped: afterTotals.lines.skipped,
        pct:
          afterTotals.lines.total - afterTotals.lines.skipped > 0
            ? (afterTotals.lines.covered /
                (afterTotals.lines.total - afterTotals.lines.skipped)) *
              100
            : 0
      },
      statements: {
        total: afterTotals.statements.total,
        covered: afterTotals.statements.covered,
        skipped: afterTotals.statements.skipped,
        pct:
          afterTotals.statements.total - afterTotals.statements.skipped > 0
            ? (afterTotals.statements.covered /
                (afterTotals.statements.total -
                  afterTotals.statements.skipped)) *
              100
            : 0
      },
      functions: {
        total: afterTotals.functions.total,
        covered: afterTotals.functions.covered,
        skipped: afterTotals.functions.skipped,
        pct:
          afterTotals.functions.total - afterTotals.functions.skipped > 0
            ? (afterTotals.functions.covered /
                (afterTotals.functions.total - afterTotals.functions.skipped)) *
              100
            : 0
      },
      branches: {
        total: afterTotals.branches.total,
        covered: afterTotals.branches.covered,
        skipped: afterTotals.branches.skipped,
        pct:
          afterTotals.branches.total - afterTotals.branches.skipped > 0
            ? (afterTotals.branches.covered /
                (afterTotals.branches.total - afterTotals.branches.skipped)) *
              100
            : 0
      }
    }
  }
}

function getChangeEmoji(change: number): string {
  if (change > 0) return '🟢'
  if (change < 0) return '🟡'
  return '⚪'
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

function formatChange(change: number): string {
  const emoji = getChangeEmoji(change)
  const sign = change > 0 ? '+' : ''
  return `${emoji} ${sign}${change.toFixed(2)}%`
}

function compareProjects(
  newProjects: ProjectCoverage[],
  oldProjects: ProjectCoverage[]
): ProjectDiff[] {
  const diffs: ProjectDiff[] = []
  const oldProjectMap = new Map<string, ProjectCoverage>()

  for (const oldProject of oldProjects) {
    oldProjectMap.set(oldProject.projectPath, oldProject)
  }

  for (const newProject of newProjects) {
    const oldProject = oldProjectMap.get(newProject.projectPath)

    if (!oldProject) {
      // New project
      diffs.push({
        projectName: newProject.projectPath,
        projectPath: newProject.projectPath,
        before: {
          lines: {total: 0, covered: 0, skipped: 0, pct: 0},
          statements: {total: 0, covered: 0, skipped: 0, pct: 0},
          functions: {total: 0, covered: 0, skipped: 0, pct: 0},
          branches: {total: 0, covered: 0, skipped: 0, pct: 0}
        },
        after: normalizeCoverageMetrics(newProject.coverage.total),
        isNew: true,
        hasChanges: true,
        diffChecker: null
      })
    } else {
      // Existing project - check for changes using DiffChecker
      const diffChecker = new DiffChecker(
        newProject.coverage,
        oldProject.coverage
      )

      const normalizedOld = normalizeCoverageMetrics(oldProject.coverage.total)
      const normalizedNew = normalizeCoverageMetrics(newProject.coverage.total)

      const hasChanges =
        normalizedNew.lines.pct !== normalizedOld.lines.pct ||
        normalizedNew.statements.pct !== normalizedOld.statements.pct ||
        normalizedNew.functions.pct !== normalizedOld.functions.pct ||
        normalizedNew.branches.pct !== normalizedOld.branches.pct

      if (hasChanges) {
        diffs.push({
          projectName: newProject.projectPath,
          projectPath: newProject.projectPath,
          before: normalizedOld,
          after: normalizedNew,
          isNew: false,
          hasChanges: true,
          diffChecker
        })
      }
    }
  }

  return diffs
}

function formatMonorepoCoverageComment(
  projectDiffs: ProjectDiff[],
  commitSha: string,
  baseSha: string | undefined
): string {
  if (projectDiffs.length === 0) {
    return '<!-- coverage-comparison -->\n## 📊 Coverage Report\n\nNo changes to code coverage.'
  }

  const totals = calculateWeightedTotals(projectDiffs)

  let comment = '<!-- coverage-comparison -->\n'
  comment += '## 📊 Coverage Report\n\n'
  comment += '### Summary\n\n'
  comment += '| Metric | Before | After | Change |\n'
  comment += '|--------|--------|-------|--------|\n'

  const linesChange = totals.after.lines.pct - totals.before.lines.pct
  const stmtsChange = totals.after.statements.pct - totals.before.statements.pct
  const funcsChange = totals.after.functions.pct - totals.before.functions.pct
  const branchesChange = totals.after.branches.pct - totals.before.branches.pct

  comment += `| Lines | ${formatPercentage(
    totals.before.lines.pct
  )} | ${formatPercentage(totals.after.lines.pct)} | ${formatChange(
    linesChange
  )} |\n`
  comment += `| Statements | ${formatPercentage(
    totals.before.statements.pct
  )} | ${formatPercentage(totals.after.statements.pct)} | ${formatChange(
    stmtsChange
  )} |\n`
  comment += `| Functions | ${formatPercentage(
    totals.before.functions.pct
  )} | ${formatPercentage(totals.after.functions.pct)} | ${formatChange(
    funcsChange
  )} |\n`
  comment += `| Branches | ${formatPercentage(
    totals.before.branches.pct
  )} | ${formatPercentage(totals.after.branches.pct)} | ${formatChange(
    branchesChange
  )} |\n`

  comment += '\n### 📦 Package Details\n\n'

  for (const project of projectDiffs) {
    if (project.isNew) {
      comment += `<details>\n`
      comment += `<summary>📦 ${project.projectName} (🆕 New Project)</summary>\n\n`
      comment += '#### Package Summary\n\n'
      comment += '| Metric | Coverage |\n'
      comment += '|--------|----------|\n'
      comment += `| Lines | ${formatPercentage(project.after.lines.pct)} |\n`
      comment += `| Statements | ${formatPercentage(
        project.after.statements.pct
      )} |\n`
      comment += `| Functions | ${formatPercentage(
        project.after.functions.pct
      )} |\n`
      comment += `| Branches | ${formatPercentage(
        project.after.branches.pct
      )} |\n`
      comment += '\n</details>\n\n'
    } else if (project.hasChanges && project.diffChecker) {
      const projectLinesChange =
        project.after.lines.pct - project.before.lines.pct
      const projectStmtsChange =
        project.after.statements.pct - project.before.statements.pct
      const projectFuncsChange =
        project.after.functions.pct - project.before.functions.pct
      const projectBranchesChange =
        project.after.branches.pct - project.before.branches.pct

      comment += `<details>\n`
      comment += `<summary>📦 ${project.projectName} (${formatChange(
        projectLinesChange
      )})</summary>\n\n`
      comment += '#### Package Summary\n\n'
      comment += '| Metric | Before | After | Change |\n'
      comment += '|--------|--------|-------|--------|\n'
      comment += `| Lines | ${formatPercentage(
        project.before.lines.pct
      )} | ${formatPercentage(project.after.lines.pct)} | ${formatChange(
        projectLinesChange
      )} |\n`
      comment += `| Statements | ${formatPercentage(
        project.before.statements.pct
      )} | ${formatPercentage(project.after.statements.pct)} | ${formatChange(
        projectStmtsChange
      )} |\n`
      comment += `| Functions | ${formatPercentage(
        project.before.functions.pct
      )} | ${formatPercentage(project.after.functions.pct)} | ${formatChange(
        projectFuncsChange
      )} |\n`
      comment += `| Branches | ${formatPercentage(
        project.before.branches.pct
      )} | ${formatPercentage(project.after.branches.pct)} | ${formatChange(
        projectBranchesChange
      )} |\n`

      // Use DiffChecker to get file-level details
      const coverageDetails = project.diffChecker.getCoverageDetails(true, '')

      if (coverageDetails.length > 0) {
        comment += '\n#### Files with Changes\n\n'
        comment += coverageDetails.join('\n')
        comment += '\n'
      }

      comment += '\n</details>\n\n'
    }
  }

  const totalFileCount = projectDiffs.reduce((acc, p) => {
    return acc + Object.keys(p.after).length - 1
  }, 0)

  comment += `**Baseline:** \`${baseSha || 'unknown'}\`\n`
  comment += `**Current:** \`${commitSha}\`\n`
  comment += `**Files with coverage:** ${totalFileCount}\n\n`
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
    const commentIdentifier = `<!-- coverage-comparison -->`
    let totalDelta = null
    if (rawTotalDelta !== null) {
      totalDelta = Number(rawTotalDelta)
    }
    let commentId = null

    // Find all coverage files in the directories
    const newProjects = findCoverageSummaryFiles(newCoveragePath)
    const oldProjects = findCoverageSummaryFiles(oldCoveragePath)

    core.info(`Found ${newProjects.length} projects in new coverage`)
    core.info(`Found ${oldProjects.length} projects in old coverage`)

    const projectDiffs = compareProjects(newProjects, oldProjects)
    const baseSha = github.context.payload.pull_request?.base.sha

    const messageToPost = formatMonorepoCoverageComment(
      projectDiffs,
      commitSha,
      baseSha
    )

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

    // Check if coverage falls below delta
    if (projectDiffs.length > 0) {
      // Check total coverage across all metrics if totalDelta is set
      if (totalDelta !== null) {
        const totals = calculateWeightedTotals(projectDiffs)
        const metrics = [
          {
            name: 'lines',
            change: totals.after.lines.pct - totals.before.lines.pct
          },
          {
            name: 'statements',
            change: totals.after.statements.pct - totals.before.statements.pct
          },
          {
            name: 'functions',
            change: totals.after.functions.pct - totals.before.functions.pct
          },
          {
            name: 'branches',
            change: totals.after.branches.pct - totals.before.branches.pct
          }
        ]

        for (const metric of metrics) {
          if (metric.change < -totalDelta) {
            const errorMessage = `Current PR reduces the total ${
              metric.name
            } coverage by ${Math.abs(metric.change).toFixed(
              2
            )}% (threshold: ${totalDelta}%)`
            core.setFailed(errorMessage)
            return
          }
        }
      }

      // Check per-project coverage using DiffChecker (checks all metrics)
      for (const project of projectDiffs) {
        if (!project.isNew && project.diffChecker) {
          if (
            project.diffChecker.checkIfTestCoverageFallsBelowDelta(delta, null)
          ) {
            const errorMessage = `Project ${project.projectName} coverage reduced below threshold (${delta}%)`
            core.setFailed(errorMessage)
            return
          }
        }
      }
    }
  } catch (error) {
    core.setFailed(error)
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
