// Mock script to test main.ts locally without posting to GitHub
process.env.INPUT_ACCESSTOKEN = 'mock-token'
process.env.INPUT_DELTA = '100'
process.env.INPUT_TOTAL_DELTA = ''
process.env.INPUT_NEWCOVERAGEPATH = 'coverage'
process.env.INPUT_OLDCOVERAGEPATH = 'baseline/coverage'
process.env.INPUT_USESAMECOMMENT = 'true'
process.env.INPUT_COMMENT = 'mock comment'
process.env.GITHUB_REPOSITORY = 'owner/repo'
process.env.GITHUB_SHA = 'abc123def456'

// Mock GitHub context
const mockContext = {
  repo: {
    repo: 'repo',
    owner: 'owner'
  },
  sha: 'abc123def456',
  issue: {
    number: 123
  },
  payload: {
    pull_request: {
      base: {
        sha: 'base-sha-123'
      }
    }
  }
}

// Mock @actions/core
const mockCore = {
  getInput: (name) => {
    const inputName = `INPUT_${name.toUpperCase()}`
    return process.env[inputName] || ''
  },
  info: (message) => {
    console.log('[INFO]', message)
  },
  warning: (message) => {
    console.warn('[WARNING]', message)
  },
  setFailed: (message) => {
    console.error('[FAILED]', message)
    process.exitCode = 1
  }
}

// Mock @actions/github
const mockGithub = {
  context: mockContext,
  getOctokit: (token) => {
    console.log('[MOCK] GitHub client created with token:', token)
    return {
      issues: {
        updateComment: async (params) => {
          console.log('[MOCK] Would update comment:', JSON.stringify(params, null, 2))
          return { data: {} }
        },
        createComment: async (params) => {
          console.log('[MOCK] Would create comment:')
          console.log('='.repeat(80))
          console.log(params.body)
          console.log('='.repeat(80))
          return { data: {} }
        },
        listComments: async (params) => {
          console.log('[MOCK] Would list comments:', JSON.stringify(params, null, 2))
          return { data: [] } // Return empty array so it creates a new comment
        }
      }
    }
  }
}

// Replace the actual modules with mocks
require('module').Module._cache[require.resolve('@actions/core')] = {
  exports: mockCore
}

require('module').Module._cache[require.resolve('@actions/github')] = {
  exports: mockGithub
}

// Now require and run the main module
console.log('Starting local test...\n')
require('./lib/main.js')

