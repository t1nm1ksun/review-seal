export interface ReviewComment {
  file_path: string
  start_line: number | null
  end_line: number | null
  body: string
  severity: 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
}

export interface ReviewResponse {
  summary: string
  comments: ReviewComment[]
}

const DEFAULT_RULES = `- Assume yourself as a principal frontend engineer with expertise in React, Next.js, and Vercel best practices
- Review for reuse, quality, and efficiency, then fix any issues found`

function buildSystemPrompt(customRules?: string | null): string {
  const rules = customRules || DEFAULT_RULES
  return `You are a senior code reviewer. Review the given pull request diff carefully.
Identify bugs, security issues, performance problems, and code quality concerns.
Be specific with file paths and line numbers.

Review rules:
${rules}

You MUST respond with valid JSON in this exact format:
{
  "summary": "Brief overall review summary in 2-3 sentences",
  "comments": [
    {
      "file_path": "path/to/file.ts",
      "start_line": 42,
      "end_line": 45,
      "body": "Explanation of the issue or suggestion",
      "severity": "P1|P2|P3|P4|P5"
    }
  ]
}

Severity levels:
- P1: bugs, security vulnerabilities, data loss risks (must fix)
- P2: performance issues, potential bugs, bad practices (should fix)
- P3: code style, readability, minor optimizations (nice to fix)
- P4: nitpicks, optional improvements (consider)
- P5: praise, well-written code worth highlighting`
}

function buildUserPrompt(prompt: string, customInstructions: string | null, diff: string): string {
  let userPrompt = `Review prompt: ${prompt}\n\n`
  if (customInstructions) {
    userPrompt += `Additional instructions: ${customInstructions}\n\n`
  }
  userPrompt += `PR Diff:\n\`\`\`diff\n${diff}\n\`\`\``
  return userPrompt
}

export async function callClaude(
  apiKey: string,
  prompt: string,
  customInstructions: string | null,
  diff: string,
  rules?: string | null,
): Promise<ReviewResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: buildSystemPrompt(rules),
      messages: [
        { role: 'user', content: buildUserPrompt(prompt, customInstructions, diff) },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.content[0].text
  return parseJsonResponse(text)
}

export async function callOpenAI(
  apiKey: string,
  prompt: string,
  customInstructions: string | null,
  diff: string,
  rules?: string | null,
): Promise<ReviewResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(rules) },
        { role: 'user', content: buildUserPrompt(prompt, customInstructions, diff) },
      ],
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.choices[0].message.content
  return parseJsonResponse(text)
}

function parseJsonResponse(text: string): ReviewResponse {
  // Try to extract JSON from the response
  let jsonStr = text.trim()

  // If wrapped in markdown code block
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  const parsed = JSON.parse(jsonStr)

  return {
    summary: parsed.summary || 'No summary provided',
    comments: (parsed.comments || []).map((c: Record<string, unknown>) => ({
      file_path: c.file_path || '',
      start_line: c.start_line ?? null,
      end_line: c.end_line ?? null,
      body: c.body || '',
      severity: ['P1', 'P2', 'P3', 'P4', 'P5'].includes(c.severity as string)
        ? c.severity
        : 'P3',
    })),
  }
}
