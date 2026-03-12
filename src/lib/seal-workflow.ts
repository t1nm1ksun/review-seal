/** The workflow YAML to install in target repos for Claude Code review */
export const WORKFLOW_FILE_NAME = 'seal-review.yml'
export const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE_NAME}`

export const WORKFLOW_CONTENT = `name: Review Seal - AI Code Review

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review'
        required: true
      custom_instructions:
        description: 'Additional review instructions'
        required: false
        default: ''

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Checkout PR branch
        run: gh pr checkout \${{ inputs.pr_number }}
        env:
          GH_TOKEN: \${{ github.token }}

      - name: Run Claude Code Review
        id: review
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review PR #\${{ inputs.pr_number }} thoroughly.

            You are a principal frontend engineer. Review this PR for:
            - Bugs and security vulnerabilities (P1)
            - Performance issues and bad practices (P2)
            - Code style and readability (P3)
            - Minor improvements (P4)
            - Highlight well-written code (P5)

            \${{ inputs.custom_instructions }}

            Post your review as a PR comment with severity labels.
          pr_number: \${{ inputs.pr_number }}
`
