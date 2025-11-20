export interface CoverageData {
  total: number
  covered: number
  skipped: number
  pct: number | string // Can be "Unknown" when total is 0
}
