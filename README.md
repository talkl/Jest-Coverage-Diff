# Jest coverage diff

Use the action to get jest coverage diff for pull requests as a comment on the pull request.
Helps the code reviewer to get the high level view of code coverage changes without leaving the pull request window.

**Now with full Monorepo Support!** 🎉

## Features

- 📊 Beautiful, collapsible coverage reports
- 🏗️ **Monorepo support** - automatically discovers and compares coverage for all projects
- 📈 Weighted total coverage calculation across multiple projects
- 🆕 Highlights new projects
- 🎯 Shows only projects with changes
- 📁 File-level coverage details for each project
- ⚠️ Configurable thresholds to fail CI on coverage drops

## Example Output

### Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines | 70.29% | 69.53% | 🟡 -0.76% |
| Statements | 69.97% | 69.13% | 🟡 -0.84% |
| Functions | 59.35% | 56.85% | 🟡 -2.50% |
| Branches | 48.91% | 47.39% | 🟡 -1.52% |

### 📦 Package Details

<details>
<summary>📦 backend/liquidity-service (🟡 -4.01%)</summary>

#### Package Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines | 85.07% | 81.06% | 🟡 -4.01% |
| Statements | 84.71% | 80.46% | 🟡 -4.25% |
| Functions | 76.27% | 69.49% | 🟡 -6.78% |
| Branches | 71.11% | 61.11% | 🟡 -10.00% |

</details>

# How It Works

The action is a **pure comparison tool** - it recursively searches for all `coverage-summary.json` files in the specified directories and generates a comprehensive diff report.

## Typical Workflow

1. Run your tests and generate coverage for the current PR branch
2. Download baseline coverage from S3/artifact storage (using base branch SHA)
3. Action compares all projects and generates a beautiful diff comment
4. Optionally fails CI if coverage drops below threshold

**Note**: The action does NOT run tests or perform git operations. You must provide pre-generated coverage files in both directories.

# Configuration

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `accessToken` | GitHub token for commenting on PR | No | `${{ github.token }}` |
| `newCoveragePath` | Path to new/current coverage directory | **Yes** | - |
| `oldCoveragePath` | Path to baseline coverage directory | **Yes** | - |
| `useSameComment` | Update existing comment instead of creating new ones | No | `false` |
| `delta` | Maximum allowed coverage drop per project (percentage) | No | `100` |
| `total_delta` | Maximum allowed total coverage drop (percentage) | No | `null` |

## Sample Workflow - Monorepo

```yaml
name: Coverage Diff

on: pull_request

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      # Generate coverage for current PR
      - name: Run tests with coverage
        run: npm run test:coverage
      
      # Download baseline coverage from S3
      - name: Download baseline coverage
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
        run: |
          aws s3 sync s3://your-bucket/coverage/$BASE_SHA/ baseline/coverage/
      
      # Compare coverage
      - name: Coverage Diff
        uses: talkl/Jest-Coverage-Diff@master
        with:
          newCoveragePath: coverage
          oldCoveragePath: baseline/coverage
          useSameComment: true
          delta: 1
          total_delta: 0.5
```

## Sample Workflow - Single Project

```yaml
name: Coverage Diff

on: pull_request

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      
      # Run tests and generate coverage
      - name: Generate current coverage
        run: npx jest --coverage --coverageReporters="json-summary" --coverageDirectory="./coverage"
      
      # Switch to base branch and generate baseline coverage
      - name: Generate baseline coverage
        run: |
          git fetch origin ${{ github.event.pull_request.base.ref }}
          git checkout origin/${{ github.event.pull_request.base.ref }}
          npm ci
          npx jest --coverage --coverageReporters="json-summary" --coverageDirectory="./baseline/coverage"
          git checkout -
      
      - name: Coverage Diff
        uses: talkl/Jest-Coverage-Diff@master
        with:
          newCoveragePath: coverage
          oldCoveragePath: baseline/coverage
          delta: 1
```

## Monorepo Directory Structure

The action expects the following structure:

```
coverage/
├── apps/
│   ├── backend/
│   │   ├── liquidity-service/
│   │   │   └── coverage-summary.json
│   │   └── audit-logs-service/
│   │       └── coverage-summary.json
│   └── frontend/
│       └── coverage-summary.json
└── packages/
    ├── utils/
    │   └── coverage-summary.json
    └── components/
        └── coverage-summary.json
```

Each `coverage-summary.json` should follow the standard Jest coverage format.

## Advanced Configuration

### Delta Thresholds

- `delta`: Per-project threshold (e.g., `1` = fail if any project drops >1%)
- `total_delta`: Overall threshold (e.g., `0.5` = fail if total coverage drops >0.5%)

## Notes

- The action works best with pull request events
- Projects that exist in baseline but not in new coverage are silently ignored
- New projects are highlighted with 🆕 but don't cause failures
- Only projects with actual changes are shown in the comment
- All details are collapsed by default for a clean view

## License

MIT
