import path from 'path'
import fs from 'fs'

// Import the functions we need to test by requiring the compiled JS
// We'll need to export these functions from main.ts first
describe('Main Module Tests', () => {
  const baselinePath = path.join(__dirname, 'baseline', 'coverage')
  const currentPath = path.join(__dirname, 'coverage')

  describe('Coverage File Discovery', () => {
    it('should find all coverage-summary.json files in baseline directory', () => {
      // Manually traverse to verify the expected files exist
      const expectedFiles = [
        'apps/backend/audit-logs-service/coverage-summary.json',
        'apps/backend/liquidity-service/coverage-summary.json',
        'packages/bloomberg/coverage-summary.json'
      ]

      for (const file of expectedFiles) {
        const fullPath = path.join(baselinePath, file)
        expect(fs.existsSync(fullPath)).toBe(true)
      }
    })

    it('should find all coverage-summary.json files in current directory', () => {
      const expectedFiles = [
        'apps/backend/audit-logs-service/coverage-summary.json',
        'apps/backend/liquidity-service/coverage-summary.json'
      ]

      for (const file of expectedFiles) {
        const fullPath = path.join(currentPath, file)
        expect(fs.existsSync(fullPath)).toBe(true)
      }
    })
  })

  describe('Coverage Data Parsing', () => {
    it('should correctly parse baseline liquidity-service coverage data', () => {
      const coveragePath = path.join(
        baselinePath,
        'apps/backend/liquidity-service/coverage-summary.json'
      )
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))

      expect(coverage.total).toBeDefined()
      expect(coverage.total.lines.total).toBe(449)
      expect(coverage.total.lines.covered).toBe(382)
      expect(coverage.total.lines.skipped).toBe(0)
      expect(coverage.total.lines.pct).toBe(85.07)
      expect(coverage.total.statements.pct).toBe(84.71)
      expect(coverage.total.statements.skipped).toBe(0)
      expect(coverage.total.functions.pct).toBe(76.27)
      expect(coverage.total.functions.skipped).toBe(0)
      expect(coverage.total.branches.pct).toBe(71.11)
      expect(coverage.total.branches.skipped).toBe(0)
    })

    it('should correctly parse current liquidity-service coverage data', () => {
      const coveragePath = path.join(
        currentPath,
        'apps/backend/liquidity-service/coverage-summary.json'
      )
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))

      expect(coverage.total).toBeDefined()
      expect(coverage.total.lines.total).toBe(449)
      expect(coverage.total.lines.covered).toBe(378)
      expect(coverage.total.lines.skipped).toBe(0)
      expect(coverage.total.lines.pct).toBe(84.18)
      expect(coverage.total.statements.pct).toBe(83.65)
      expect(coverage.total.statements.skipped).toBe(0)
      expect(coverage.total.functions.pct).toBe(71.18)
      expect(coverage.total.functions.skipped).toBe(0)
      expect(coverage.total.branches.pct).toBe(68.88)
      expect(coverage.total.branches.skipped).toBe(0)
    })

    it('should correctly parse bloomberg package baseline coverage data', () => {
      const coveragePath = path.join(
        baselinePath,
        'packages/bloomberg/coverage-summary.json'
      )
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))

      expect(coverage.total).toBeDefined()
      expect(coverage.total.lines.total).toBe(287)
      expect(coverage.total.lines.covered).toBe(193)
      expect(coverage.total.lines.skipped).toBe(0)
      expect(coverage.total.lines.pct).toBe(67.24)
      expect(coverage.total.statements.pct).toBe(66.66)
      expect(coverage.total.statements.skipped).toBe(0)
      expect(coverage.total.functions.pct).toBe(61.36)
      expect(coverage.total.functions.skipped).toBe(0)
      expect(coverage.total.branches.pct).toBe(49.01)
      expect(coverage.total.branches.skipped).toBe(0)
    })

    it('should correctly parse audit-logs-service coverage data with Unknown values', () => {
      const coveragePath = path.join(
        baselinePath,
        'apps/backend/audit-logs-service/coverage-summary.json'
      )
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))

      expect(coverage.total).toBeDefined()
      expect(coverage.total.lines.total).toBe(0)
      expect(coverage.total.lines.covered).toBe(0)
      expect(coverage.total.lines.skipped).toBe(0)
      expect(coverage.total.lines.pct).toBe('Unknown')
      expect(coverage.total.statements.pct).toBe('Unknown')
      expect(coverage.total.statements.skipped).toBe(0)
      expect(coverage.total.functions.pct).toBe('Unknown')
      expect(coverage.total.functions.skipped).toBe(0)
      expect(coverage.total.branches.pct).toBe('Unknown')
      expect(coverage.total.branches.skipped).toBe(0)
    })
  })

  describe('Coverage Change Detection', () => {
    it('should detect coverage decrease in liquidity-service', () => {
      const baselineCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const currentCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Lines coverage decreased from 85.07% to 84.18%
      const linesChange =
        currentCoverage.total.lines.pct - baselineCoverage.total.lines.pct
      expect(linesChange).toBeCloseTo(-0.89, 2)

      // Statements coverage decreased from 84.71% to 83.65%
      const statementsChange =
        currentCoverage.total.statements.pct -
        baselineCoverage.total.statements.pct
      expect(statementsChange).toBeCloseTo(-1.06, 2)

      // Functions coverage decreased from 76.27% to 71.18%
      const functionsChange =
        currentCoverage.total.functions.pct -
        baselineCoverage.total.functions.pct
      expect(functionsChange).toBeCloseTo(-5.09, 2)

      // Branches coverage decreased from 71.11% to 68.88%
      const branchesChange =
        currentCoverage.total.branches.pct - baselineCoverage.total.branches.pct
      expect(branchesChange).toBeCloseTo(-2.23, 2)
    })

    it('should detect new project (audit-logs-service exists in current but not meaningfully in baseline)', () => {
      const baselineCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/audit-logs-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const currentCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/audit-logs-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Both have "Unknown" values, so they're essentially empty
      expect(baselineCoverage.total.lines.pct).toBe('Unknown')
      expect(currentCoverage.total.lines.pct).toBe('Unknown')
    })

    it('should detect removed project (bloomberg exists in baseline but not in current)', () => {
      const bloombergBaselinePath = path.join(
        baselinePath,
        'packages/bloomberg/coverage-summary.json'
      )
      const bloombergCurrentPath = path.join(
        currentPath,
        'packages/bloomberg/coverage-summary.json'
      )

      expect(fs.existsSync(bloombergBaselinePath)).toBe(true)
      expect(fs.existsSync(bloombergCurrentPath)).toBe(false)
    })
  })

  describe('File-level Coverage Details', () => {
    it('should have file-level details in liquidity-service coverage', () => {
      const currentCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      const fileKeys = Object.keys(currentCoverage).filter(
        key => key !== 'total'
      )
      expect(fileKeys.length).toBeGreaterThan(0)

      // Check specific file exists
      const errorsFile = fileKeys.find(key => key.includes('errors.ts'))
      expect(errorsFile).toBeDefined()
    })

    it('should correctly parse file-level coverage data', () => {
      const baselineCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const currentCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Find the service.ts file in both
      const baselineServiceFile = Object.keys(baselineCoverage).find(key =>
        key.includes('forwards/service.ts')
      )
      const currentServiceFile = Object.keys(currentCoverage).find(key =>
        key.includes('forwards/service.ts')
      )

      expect(baselineServiceFile).toBeDefined()
      expect(currentServiceFile).toBeDefined()

      if (baselineServiceFile && currentServiceFile) {
        const baselineData = baselineCoverage[baselineServiceFile]
        const currentData = currentCoverage[currentServiceFile]

        // This file should show coverage decrease
        // Baseline: lines 66.4%, functions 58.33%
        // Current: lines 63.2%, functions 45.83%
        expect(baselineData.lines.pct).toBe(66.4)
        expect(currentData.lines.pct).toBe(63.2)
        expect(baselineData.functions.pct).toBe(58.33)
        expect(currentData.functions.pct).toBe(45.83)

        const linesChange = currentData.lines.pct - baselineData.lines.pct
        const functionsChange =
          currentData.functions.pct - baselineData.functions.pct

        expect(linesChange).toBeCloseTo(-3.2, 2)
        expect(functionsChange).toBeCloseTo(-12.5, 2)
      }
    })
  })

  describe('Weighted Totals Calculation', () => {
    it('should correctly calculate weighted totals for multiple projects', () => {
      const baselineLiquidity = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const currentLiquidity = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const baselineBloomberg = JSON.parse(
        fs.readFileSync(
          path.join(baselinePath, 'packages/bloomberg/coverage-summary.json'),
          'utf8'
        )
      )

      // If we combine liquidity and bloomberg from baseline:
      // Liquidity: 449 lines, 382 covered, 0 skipped
      // Bloomberg: 287 lines, 193 covered, 0 skipped
      // Total: 736 lines, 575 covered, 0 skipped = 78.12%

      const totalLines =
        baselineLiquidity.total.lines.total +
        baselineBloomberg.total.lines.total
      const coveredLines =
        baselineLiquidity.total.lines.covered +
        baselineBloomberg.total.lines.covered
      const skippedLines =
        baselineLiquidity.total.lines.skipped +
        baselineBloomberg.total.lines.skipped

      expect(totalLines).toBe(736)
      expect(coveredLines).toBe(575)
      expect(skippedLines).toBe(0)

      // When skipped is 0, the formula (covered / (total - skipped)) equals (covered / total)
      const weightedPct = (coveredLines / (totalLines - skippedLines)) * 100
      expect(weightedPct).toBeCloseTo(78.12, 2)
    })

    it('should correctly calculate weighted totals accounting for skipped items', () => {
      const baselineLiquidity = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const baselineBloomberg = JSON.parse(
        fs.readFileSync(
          path.join(baselinePath, 'packages/bloomberg/coverage-summary.json'),
          'utf8'
        )
      )

      // Test with actual data
      const totalLines =
        baselineLiquidity.total.lines.total +
        baselineBloomberg.total.lines.total
      const coveredLines =
        baselineLiquidity.total.lines.covered +
        baselineBloomberg.total.lines.covered
      const skippedLines =
        baselineLiquidity.total.lines.skipped +
        baselineBloomberg.total.lines.skipped

      // Calculate percentage accounting for skipped
      const effectiveTotal = totalLines - skippedLines
      const pctWithSkipped =
        effectiveTotal > 0 ? (coveredLines / effectiveTotal) * 100 : 0

      // In our test data, skipped is 0, so this should equal the traditional calculation
      const pctWithoutSkipped =
        totalLines > 0 ? (coveredLines / totalLines) * 100 : 0

      expect(pctWithSkipped).toBe(pctWithoutSkipped)
      expect(pctWithSkipped).toBeCloseTo(78.12, 2)

      // Verify all metrics have skipped property
      expect(baselineLiquidity.total.lines.skipped).toBeDefined()
      expect(baselineBloomberg.total.lines.skipped).toBeDefined()
    })

    it('should demonstrate how skipped affects weighted totals', () => {
      // Create mock coverage data with skipped items
      const project1 = {
        lines: {total: 100, covered: 80, skipped: 10}
      }
      const project2 = {
        lines: {total: 200, covered: 120, skipped: 20}
      }

      // Combine totals
      const combinedTotal = project1.lines.total + project2.lines.total
      const combinedCovered = project1.lines.covered + project2.lines.covered
      const combinedSkipped = project1.lines.skipped + project2.lines.skipped

      expect(combinedTotal).toBe(300)
      expect(combinedCovered).toBe(200)
      expect(combinedSkipped).toBe(30)

      // Calculate with skipped (correct)
      const pctWithSkipped =
        (combinedCovered / (combinedTotal - combinedSkipped)) * 100
      // 200 / (300 - 30) = 200 / 270 = 74.07%
      expect(pctWithSkipped).toBeCloseTo(74.07, 2)

      // Calculate without skipped (incorrect)
      const pctWithoutSkipped = (combinedCovered / combinedTotal) * 100
      // 200 / 300 = 66.67%
      expect(pctWithoutSkipped).toBeCloseTo(66.67, 2)

      // With skipped accounted for, coverage is higher (more accurate)
      expect(pctWithSkipped).toBeGreaterThan(pctWithoutSkipped)
    })
  })

  describe('Coverage Metrics Validation', () => {
    it('should have all required metrics in coverage data', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      expect(coverage.total.lines).toHaveProperty('total')
      expect(coverage.total.lines).toHaveProperty('covered')
      expect(coverage.total.lines).toHaveProperty('skipped')
      expect(coverage.total.lines).toHaveProperty('pct')

      expect(coverage.total.statements).toHaveProperty('total')
      expect(coverage.total.statements).toHaveProperty('covered')
      expect(coverage.total.statements).toHaveProperty('skipped')
      expect(coverage.total.statements).toHaveProperty('pct')

      expect(coverage.total.functions).toHaveProperty('total')
      expect(coverage.total.functions).toHaveProperty('covered')
      expect(coverage.total.functions).toHaveProperty('skipped')
      expect(coverage.total.functions).toHaveProperty('pct')

      expect(coverage.total.branches).toHaveProperty('total')
      expect(coverage.total.branches).toHaveProperty('covered')
      expect(coverage.total.branches).toHaveProperty('skipped')
      expect(coverage.total.branches).toHaveProperty('pct')
    })

    it('should have skipped property as a number', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      expect(typeof coverage.total.lines.skipped).toBe('number')
      expect(typeof coverage.total.statements.skipped).toBe('number')
      expect(typeof coverage.total.functions.skipped).toBe('number')
      expect(typeof coverage.total.branches.skipped).toBe('number')
    })

    it('should have non-negative skipped values', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      expect(coverage.total.lines.skipped).toBeGreaterThanOrEqual(0)
      expect(coverage.total.statements.skipped).toBeGreaterThanOrEqual(0)
      expect(coverage.total.functions.skipped).toBeGreaterThanOrEqual(0)
      expect(coverage.total.branches.skipped).toBeGreaterThanOrEqual(0)
    })

    it('should have consistent total/covered/pct relationships', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Verify percentage calculation (using 1 decimal precision due to rounding in coverage data)
      const linesCalcPct =
        (coverage.total.lines.covered / coverage.total.lines.total) * 100
      expect(linesCalcPct).toBeCloseTo(coverage.total.lines.pct, 1)

      const stmtsCalcPct =
        (coverage.total.statements.covered / coverage.total.statements.total) *
        100
      expect(stmtsCalcPct).toBeCloseTo(coverage.total.statements.pct, 1)

      const funcsCalcPct =
        (coverage.total.functions.covered / coverage.total.functions.total) *
        100
      expect(funcsCalcPct).toBeCloseTo(coverage.total.functions.pct, 1)

      const branchesCalcPct =
        (coverage.total.branches.covered / coverage.total.branches.total) * 100
      expect(branchesCalcPct).toBeCloseTo(coverage.total.branches.pct, 1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty/unknown coverage gracefully', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/audit-logs-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      expect(coverage.total.lines.total).toBe(0)
      expect(coverage.total.lines.covered).toBe(0)
      expect(coverage.total.lines.pct).toBe('Unknown')
    })

    it('should verify directory structure matches monorepo layout', () => {
      // Verify we have the expected directory structure
      expect(fs.existsSync(path.join(baselinePath, 'apps'))).toBe(true)
      expect(fs.existsSync(path.join(baselinePath, 'packages'))).toBe(true)
      expect(fs.existsSync(path.join(baselinePath, 'apps/backend'))).toBe(true)
    })
  })

  describe('Unknown Value Handling - Integration Tests', () => {
    it('should parse coverage data with Unknown pct values in raw JSON', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/audit-logs-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Verify that Unknown is actually a string in the raw JSON
      expect(typeof coverage.total.lines.pct).toBe('string')
      expect(coverage.total.lines.pct).toBe('Unknown')
      expect(typeof coverage.total.statements.pct).toBe('string')
      expect(coverage.total.statements.pct).toBe('Unknown')
      expect(typeof coverage.total.functions.pct).toBe('string')
      expect(coverage.total.functions.pct).toBe('Unknown')
      expect(typeof coverage.total.branches.pct).toBe('string')
      expect(coverage.total.branches.pct).toBe('Unknown')
    })

    it('should treat Unknown as 0 in DiffChecker percentage calculations', () => {
      const {DiffChecker} = require('../src/DiffChecker')

      // Create coverage with Unknown string value (like audit-logs-service)
      const coverageWithUnknown = {
        total: {
          lines: {total: 0, covered: 0, pct: 'Unknown'},
          statements: {total: 0, covered: 0, pct: 'Unknown'},
          functions: {total: 0, covered: 0, pct: 'Unknown'},
          branches: {total: 0, covered: 0, pct: 'Unknown'}
        }
      }

      const coverageWithNumbers = {
        total: {
          lines: {total: 100, covered: 80, pct: 80},
          statements: {total: 100, covered: 80, pct: 80},
          functions: {total: 100, covered: 80, pct: 80},
          branches: {total: 100, covered: 80, pct: 80}
        }
      }

      // Test: DiffChecker should treat Unknown as 0
      // The diff should be: 80 (new) - 0 (Unknown normalized) = 80
      const diffChecker = new DiffChecker(
        coverageWithNumbers,
        coverageWithUnknown
      )
      const details = diffChecker.getCoverageDetails(false, '')

      // THIS WILL FAIL: getPercentage uses `pct || 0` which doesn't work for 'Unknown' string
      // 'Unknown' is truthy, so it returns 'Unknown', then 80 - 'Unknown' = NaN
      // Expected output should show "80 (80)" meaning 80% coverage with +80 change
      expect(details).toBeDefined()
      expect(details.length).toBeGreaterThan(0)
      expect(details[0]).toContain('total')

      // The output should contain "80" not "NaN"
      expect(details[0]).not.toContain('NaN')
      expect(details[0]).toContain('80')
    })

    it('should not produce NaN when comparing numeric coverage with Unknown coverage', () => {
      // Test raw arithmetic that would happen without normalization
      const unknownPct = 'Unknown'
      const numericPct = 85.07

      // WITHOUT normalization, this produces NaN (current behavior)
      const rawResult = numericPct - (unknownPct as any)
      expect(isNaN(rawResult)).toBe(true)

      // WITH normalization (what we want to implement)
      const normalizedUnknown = unknownPct === 'Unknown' ? 0 : unknownPct
      const normalizedResult = numericPct - normalizedUnknown
      expect(normalizedResult).toBe(85.07)
      expect(isNaN(normalizedResult)).toBe(false)
    })

    it('should handle formatPercentage with Unknown values by normalizing to 0', () => {
      // Simulate what formatPercentage function should do
      const unknownValue = 'Unknown'

      // WITHOUT normalization, calling toFixed() on Unknown throws
      expect(() => {
        ;(unknownValue as any).toFixed(2)
      }).toThrow()

      // WITH normalization, it should work
      const normalized = unknownValue === 'Unknown' ? 0 : unknownValue
      const formatted = `${normalized.toFixed(2)}%`
      expect(formatted).toBe('0.00%')
    })

    it('should handle Unknown values when comparing projects in real coverage files', () => {
      const auditLogsCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/audit-logs-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      const liquidityCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Verify audit-logs has Unknown
      expect(auditLogsCoverage.total.lines.pct).toBe('Unknown')
      expect(typeof liquidityCoverage.total.lines.pct).toBe('number')

      // Test that Unknown can be safely normalized
      const normalizedAuditLogs =
        auditLogsCoverage.total.lines.pct === 'Unknown'
          ? 0
          : auditLogsCoverage.total.lines.pct

      // Arithmetic should work without producing NaN
      const change = liquidityCoverage.total.lines.pct - normalizedAuditLogs
      expect(isNaN(change)).toBe(false)
      expect(change).toBeCloseTo(85.07, 1)
    })

    it('should handle DiffChecker with actual audit-logs (Unknown) vs liquidity (numeric) coverage', () => {
      const {DiffChecker} = require('../src/DiffChecker')

      const auditLogsCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/audit-logs-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      const liquidityCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // THIS WILL FAIL: Create DiffChecker with real data
      // liquidity (new) vs audit-logs (old with Unknown)
      const diffChecker = new DiffChecker(liquidityCoverage, auditLogsCoverage)
      const details = diffChecker.getCoverageDetails(false, '')

      // The diff should be liquidity pct (85.07) - 0 (Unknown normalized) = 85.07
      // But currently getPercentage returns 'Unknown' (truthy), then 85.07 - 'Unknown' = NaN
      expect(details).toBeDefined()
      expect(details.length).toBeGreaterThan(0)

      // Check that output contains percentages, not NaN
      const totalLine = details.find((line: string) => line.includes('total'))
      expect(totalLine).toBeDefined()
      expect(totalLine).not.toContain('NaN')

      // Should show the actual liquidity coverage numbers (not NaN)
      expect(totalLine).toMatch(/85\.\d+/) // lines pct around 85
    })
  })

  describe('Skipped Property Tests', () => {
    it('should correctly parse skipped values from all coverage files', () => {
      const liquidityBaseline = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const liquidityCurrent = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const bloomberg = JSON.parse(
        fs.readFileSync(
          path.join(baselinePath, 'packages/bloomberg/coverage-summary.json'),
          'utf8'
        )
      )

      // All coverage files should have skipped property
      expect(liquidityBaseline.total.lines).toHaveProperty('skipped')
      expect(liquidityCurrent.total.lines).toHaveProperty('skipped')
      expect(bloomberg.total.lines).toHaveProperty('skipped')

      // Skipped should be a number
      expect(typeof liquidityBaseline.total.lines.skipped).toBe('number')
      expect(typeof liquidityCurrent.total.lines.skipped).toBe('number')
      expect(typeof bloomberg.total.lines.skipped).toBe('number')
    })

    it('should have skipped property in file-level coverage', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      const fileKeys = Object.keys(coverage).filter(key => key !== 'total')
      expect(fileKeys.length).toBeGreaterThan(0)

      // Check that file-level coverage also has skipped property
      const firstFile = fileKeys[0]
      expect(coverage[firstFile].lines).toHaveProperty('skipped')
      expect(coverage[firstFile].statements).toHaveProperty('skipped')
      expect(coverage[firstFile].functions).toHaveProperty('skipped')
      expect(coverage[firstFile].branches).toHaveProperty('skipped')
    })

    it('should validate skipped values are consistent with total and covered', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // skipped + covered should be <= total
      expect(
        coverage.total.lines.skipped + coverage.total.lines.covered
      ).toBeLessThanOrEqual(coverage.total.lines.total)
      expect(
        coverage.total.statements.skipped + coverage.total.statements.covered
      ).toBeLessThanOrEqual(coverage.total.statements.total)
      expect(
        coverage.total.functions.skipped + coverage.total.functions.covered
      ).toBeLessThanOrEqual(coverage.total.functions.total)
      expect(
        coverage.total.branches.skipped + coverage.total.branches.covered
      ).toBeLessThanOrEqual(coverage.total.branches.total)
    })

    it('should handle skipped property in empty coverage (Unknown case)', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/audit-logs-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Empty coverage should have skipped: 0
      expect(coverage.total.lines.skipped).toBe(0)
      expect(coverage.total.statements.skipped).toBe(0)
      expect(coverage.total.functions.skipped).toBe(0)
      expect(coverage.total.branches.skipped).toBe(0)
    })

    it('should verify skipped is included in all metrics across all files', () => {
      const coverageFiles = [
        path.join(
          baselinePath,
          'apps/backend/liquidity-service/coverage-summary.json'
        ),
        path.join(
          currentPath,
          'apps/backend/liquidity-service/coverage-summary.json'
        ),
        path.join(baselinePath, 'packages/bloomberg/coverage-summary.json'),
        path.join(
          baselinePath,
          'apps/backend/audit-logs-service/coverage-summary.json'
        ),
        path.join(
          currentPath,
          'apps/backend/audit-logs-service/coverage-summary.json'
        )
      ]

      for (const filePath of coverageFiles) {
        const coverage = JSON.parse(fs.readFileSync(filePath, 'utf8'))

        // Total metrics should have skipped
        expect(coverage.total.lines).toHaveProperty('skipped')
        expect(coverage.total.statements).toHaveProperty('skipped')
        expect(coverage.total.functions).toHaveProperty('skipped')
        expect(coverage.total.branches).toHaveProperty('skipped')

        // All should be numbers >= 0
        expect(coverage.total.lines.skipped).toBeGreaterThanOrEqual(0)
        expect(coverage.total.statements.skipped).toBeGreaterThanOrEqual(0)
        expect(coverage.total.functions.skipped).toBeGreaterThanOrEqual(0)
        expect(coverage.total.branches.skipped).toBeGreaterThanOrEqual(0)
      }
    })

    it('should correctly aggregate skipped values in weighted totals calculation', () => {
      const liquidityCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const bloombergCoverage = JSON.parse(
        fs.readFileSync(
          path.join(baselinePath, 'packages/bloomberg/coverage-summary.json'),
          'utf8'
        )
      )

      // If we combine skipped counts from both projects:
      const totalSkippedLines =
        liquidityCoverage.total.lines.skipped +
        bloombergCoverage.total.lines.skipped
      const totalSkippedStatements =
        liquidityCoverage.total.statements.skipped +
        bloombergCoverage.total.statements.skipped
      const totalSkippedFunctions =
        liquidityCoverage.total.functions.skipped +
        bloombergCoverage.total.functions.skipped
      const totalSkippedBranches =
        liquidityCoverage.total.branches.skipped +
        bloombergCoverage.total.branches.skipped

      // All should be non-negative
      expect(totalSkippedLines).toBeGreaterThanOrEqual(0)
      expect(totalSkippedStatements).toBeGreaterThanOrEqual(0)
      expect(totalSkippedFunctions).toBeGreaterThanOrEqual(0)
      expect(totalSkippedBranches).toBeGreaterThanOrEqual(0)

      // Should match the sum (both have 0 skipped in the test data)
      expect(totalSkippedLines).toBe(0)
      expect(totalSkippedStatements).toBe(0)
      expect(totalSkippedFunctions).toBe(0)
      expect(totalSkippedBranches).toBe(0)
    })

    it('should correctly calculate coverage percentage with skipped items', () => {
      // Test the formula: coverage = covered / (total - skipped) * 100
      // Example: 80 covered, 100 total, 10 skipped
      // Expected: 80 / (100 - 10) = 80 / 90 = 88.89%
      // Without skipped: 80 / 100 = 80%

      const total = 100
      const covered = 80
      const skipped = 10

      // With skipped in calculation (correct)
      const pctWithSkipped = (covered / (total - skipped)) * 100
      expect(pctWithSkipped).toBeCloseTo(88.89, 2)

      // Without skipped (incorrect)
      const pctWithoutSkipped = (covered / total) * 100
      expect(pctWithoutSkipped).toBe(80)

      // Verify the difference
      expect(pctWithSkipped).toBeGreaterThan(pctWithoutSkipped)
    })

    it('should handle edge case when total equals skipped', () => {
      // If all items are skipped, coverage should be 0% (not error)
      const total = 100
      const covered = 0
      const skipped = 100

      const pct = total - skipped > 0 ? (covered / (total - skipped)) * 100 : 0
      expect(pct).toBe(0)
    })

    it('should handle edge case when skipped is 0', () => {
      // When no items are skipped, should work as before
      const total = 100
      const covered = 80
      const skipped = 0

      const pctWithSkipped = (covered / (total - skipped)) * 100
      const pctWithoutSkipped = (covered / total) * 100

      // Both should be equal when skipped is 0
      expect(pctWithSkipped).toBe(pctWithoutSkipped)
      expect(pctWithSkipped).toBe(80)
    })

    it('should verify skipped affects percentage calculation correctly', () => {
      // Scenario: Add more skipped items increases coverage percentage
      // Because we're excluding those from the denominator
      const total = 200
      const covered = 100

      // No skipped: 100/200 = 50%
      const pct0 = (covered / (total - 0)) * 100
      expect(pct0).toBe(50)

      // 20 skipped: 100/180 = 55.56%
      const pct20 = (covered / (total - 20)) * 100
      expect(pct20).toBeCloseTo(55.56, 2)

      // 50 skipped: 100/150 = 66.67%
      const pct50 = (covered / (total - 50)) * 100
      expect(pct50).toBeCloseTo(66.67, 2)

      // 100 skipped: 100/100 = 100%
      const pct100 = (covered / (total - 100)) * 100
      expect(pct100).toBe(100)

      // Verify increasing trend
      expect(pct20).toBeGreaterThan(pct0)
      expect(pct50).toBeGreaterThan(pct20)
      expect(pct100).toBeGreaterThan(pct50)
    })
  })

  describe('Coverage Key Normalization', () => {
    it('should normalize coverage keys based on project path', () => {
      // This test verifies that the actual coverage files have their keys normalized
      const baselineCoverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Check that we have absolute path keys before normalization
      const keys = Object.keys(baselineCoverage).filter(k => k !== 'total')
      expect(keys.length).toBeGreaterThan(0)

      // All file keys should contain absolute paths
      const hasAbsolutePaths = keys.some(k => k.startsWith('/'))
      expect(hasAbsolutePaths).toBe(true)

      // After normalization (which happens in findCoverageSummaryFiles),
      // keys should start with the project path
      // This is tested implicitly through the integration tests
    })

    it('should match files between baseline and current after normalization', () => {
      // When coverage keys are normalized, files from different environments should match
      // For example:
      // Baseline: "/Users/talkl/dev/grain/apps/backend/liquidity-service/src/app/forwards/service.ts"
      // Current:  "/Users/talkl/dev/grain/apps/backend/liquidity-service/src/app/forwards/service.ts"
      // Both normalize to: "apps/backend/liquidity-service/src/app/forwards/service.ts"

      const projectPath = 'apps/backend/liquidity-service'

      // Simulate baseline from GitHub Actions
      const baselineKey = `/home/runner/work/grain/grain/${projectPath}/src/app/forwards/service.ts`
      // Simulate current from local machine
      const currentKey = `/Users/talkl/dev/grain/${projectPath}/src/app/forwards/service.ts`

      // Both should normalize to the same key
      const normalizedBaseline = baselineKey.substring(
        baselineKey.indexOf(projectPath)
      )
      const normalizedCurrent = currentKey.substring(
        currentKey.indexOf(projectPath)
      )

      expect(normalizedBaseline).toBe(normalizedCurrent)
      expect(normalizedBaseline).toBe(
        `${projectPath}/src/app/forwards/service.ts`
      )
    })

    it('should preserve total key during normalization', () => {
      const projectPath = 'apps/backend/liquidity-service'
      const mockCoverage = {
        total: {
          lines: {total: 100, covered: 80, skipped: 0, pct: 80},
          statements: {total: 100, covered: 80, skipped: 0, pct: 80},
          functions: {total: 100, covered: 80, skipped: 0, pct: 80},
          branches: {total: 100, covered: 80, skipped: 0, pct: 80}
        },
        [`/home/runner/work/grain/grain/${projectPath}/src/index.ts`]: {
          lines: {total: 10, covered: 8, skipped: 0, pct: 80},
          statements: {total: 10, covered: 8, skipped: 0, pct: 80},
          functions: {total: 10, covered: 8, skipped: 0, pct: 80},
          branches: {total: 10, covered: 8, skipped: 0, pct: 80}
        }
      }

      // Simulate normalization
      const normalized: any = {}
      for (const [key, value] of Object.entries(mockCoverage)) {
        if (key === 'total') {
          normalized[key] = value
        } else {
          const index = key.indexOf(projectPath)
          if (index !== -1) {
            normalized[key.substring(index)] = value
          }
        }
      }

      expect(normalized).toHaveProperty('total')
      expect(normalized[`${projectPath}/src/index.ts`]).toBeDefined()
      expect(Object.keys(normalized).length).toBe(2)
    })

    it('should handle files with same relative path from different environments', () => {
      const projectPath = 'packages/bloomberg'
      const fileName = 'src/client.ts'

      // Different absolute paths (GitHub Actions vs local)
      const githubPath = `/home/runner/work/grain/grain/${projectPath}/${fileName}`
      const localPath = `/Users/talkl/dev/grain/${projectPath}/${fileName}`
      const anotherLocalPath = `/Users/john/projects/grain/${projectPath}/${fileName}`

      // All should normalize to the same key
      const normalizedGithub = githubPath.substring(
        githubPath.indexOf(projectPath)
      )
      const normalizedLocal = localPath.substring(
        localPath.indexOf(projectPath)
      )
      const normalizedAnother = anotherLocalPath.substring(
        anotherLocalPath.indexOf(projectPath)
      )

      expect(normalizedGithub).toBe(normalizedLocal)
      expect(normalizedLocal).toBe(normalizedAnother)
      expect(normalizedGithub).toBe(`${projectPath}/${fileName}`)
    })

    it('should not duplicate files after normalization', () => {
      // This verifies that after normalization, DiffChecker won't see the same file as both new and deleted
      const projectPath = 'apps/backend/liquidity-service'

      const mockOldCoverage = {
        total: {
          lines: {total: 100, covered: 80, skipped: 0, pct: 80},
          statements: {total: 100, covered: 80, skipped: 0, pct: 80},
          functions: {total: 100, covered: 80, skipped: 0, pct: 80},
          branches: {total: 100, covered: 80, skipped: 0, pct: 80}
        },
        [`/home/runner/work/grain/grain/${projectPath}/src/file.ts`]: {
          lines: {total: 10, covered: 8, skipped: 0, pct: 80},
          statements: {total: 10, covered: 8, skipped: 0, pct: 80},
          functions: {total: 10, covered: 8, skipped: 0, pct: 80},
          branches: {total: 10, covered: 8, skipped: 0, pct: 80}
        }
      }

      const mockNewCoverage = {
        total: {
          lines: {total: 100, covered: 85, skipped: 0, pct: 85},
          statements: {total: 100, covered: 85, skipped: 0, pct: 85},
          functions: {total: 100, covered: 85, skipped: 0, pct: 85},
          branches: {total: 100, covered: 85, skipped: 0, pct: 85}
        },
        [`/Users/talkl/dev/grain/${projectPath}/src/file.ts`]: {
          lines: {total: 10, covered: 9, skipped: 0, pct: 90},
          statements: {total: 10, covered: 9, skipped: 0, pct: 90},
          functions: {total: 10, covered: 9, skipped: 0, pct: 90},
          branches: {total: 10, covered: 9, skipped: 0, pct: 90}
        }
      }

      // Normalize both
      const normalizeKeys = (coverage: any, projPath: string) => {
        const result: any = {}
        for (const [key, value] of Object.entries(coverage)) {
          if (key === 'total') {
            result[key] = value
          } else {
            const idx = key.indexOf(projPath)
            result[idx !== -1 ? key.substring(idx) : key] = value
          }
        }
        return result
      }

      const normalizedOld = normalizeKeys(mockOldCoverage, projectPath)
      const normalizedNew = normalizeKeys(mockNewCoverage, projectPath)

      // Both should have the same file key
      const fileKey = `${projectPath}/src/file.ts`

      // Use bracket notation to check for keys with slashes
      expect(normalizedOld[fileKey]).toBeDefined()
      expect(normalizedNew[fileKey]).toBeDefined()
      expect(Object.keys(normalizedOld)).toContain(fileKey)
      expect(Object.keys(normalizedNew)).toContain(fileKey)
    })
  })

  describe('Coverage Comparison Scenarios', () => {
    it('should demonstrate a scenario where coverage decreased', () => {
      const baseline = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const current = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // All metrics decreased
      expect(current.total.lines.pct).toBeLessThan(baseline.total.lines.pct)
      expect(current.total.statements.pct).toBeLessThan(
        baseline.total.statements.pct
      )
      expect(current.total.functions.pct).toBeLessThan(
        baseline.total.functions.pct
      )
      expect(current.total.branches.pct).toBeLessThan(
        baseline.total.branches.pct
      )
    })

    it('should demonstrate a scenario where lines count stayed the same but coverage changed', () => {
      const baseline = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )
      const current = JSON.parse(
        fs.readFileSync(
          path.join(
            currentPath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Total lines stayed the same (449)
      expect(current.total.lines.total).toBe(baseline.total.lines.total)
      expect(current.total.lines.total).toBe(449)

      // But covered lines decreased from 382 to 378
      expect(current.total.lines.covered).toBeLessThan(
        baseline.total.lines.covered
      )
      expect(baseline.total.lines.covered).toBe(382)
      expect(current.total.lines.covered).toBe(378)
    })

    it('should correctly identify coverage data with multiple files', () => {
      const coverage = JSON.parse(
        fs.readFileSync(
          path.join(
            baselinePath,
            'apps/backend/liquidity-service/coverage-summary.json'
          ),
          'utf8'
        )
      )

      // Should have 'total' plus individual file entries
      const keys = Object.keys(coverage)
      expect(keys).toContain('total')
      expect(keys.length).toBeGreaterThan(1) // At least 'total' + some files

      // Verify some expected files
      const files = keys.filter(k => k !== 'total')
      expect(files.some(f => f.includes('errors.ts'))).toBe(true)
      expect(files.some(f => f.includes('service.ts'))).toBe(true)
    })
  })
})
