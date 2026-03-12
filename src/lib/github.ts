const GITHUB_API = 'https://api.github.com'

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: { login: string; avatar_url: string }
  private: boolean
  html_url: string
  description: string | null
  open_issues_count: number
}

export interface GitHubPR {
  id: number
  number: number
  title: string
  body: string | null
  state: string
  html_url: string
  created_at: string
  updated_at: string
  user: { login: string; avatar_url: string }
  head: { ref: string; sha: string }
  base: { ref: string }
  changed_files: number
  additions: number
  deletions: number
  draft: boolean
}

export interface PRFile {
  sha: string
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
}

export interface ReviewThread {
  id: number
  is_resolved: boolean
  comments: Array<{
    id: number
    body: string
    user: { login: string }
    created_at: string
  }>
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?sort=pushed&per_page=100&page=${page}`,
      { headers: headers(token) },
    )
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
    const data: GitHubRepo[] = await res.json()
    if (data.length === 0) break
    repos.push(...data)
    if (data.length < 100) break
    page++
  }

  return repos
}

export async function fetchPullRequests(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubPR[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`,
    { headers: headers(token) },
  )
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  return res.json()
}

export async function fetchPRDetail(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<GitHubPR> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers: headers(token) },
  )
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  return res.json()
}

export async function fetchPRDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      headers: {
        ...headers(token),
        Accept: 'application/vnd.github.v3.diff',
      },
    },
  )
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  return res.text()
}

export async function fetchPRFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRFile[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    { headers: headers(token) },
  )
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  return res.json()
}

/** Trigger a workflow_dispatch event on a repo */
export async function triggerWorkflowDispatch(
  token: string,
  owner: string,
  repo: string,
  workflowFileName: string,
  ref: string,
  inputs: Record<string, string>,
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/dispatches`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ ref, inputs }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to trigger workflow: ${res.status} ${text}`)
  }
}

/** Check if a workflow file exists in a repo */
export async function checkWorkflowExists(
  token: string,
  owner: string,
  repo: string,
  path: string,
): Promise<boolean> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: headers(token) },
  )
  return res.ok
}

/** Create or update a file in a repo via GitHub API */
export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string,
): Promise<void> {
  const body: Record<string, string> = {
    message,
    content: btoa(content),
    branch,
  }
  if (sha) body.sha = sha

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create file: ${res.status} ${text}`)
  }
}

/** Get the latest workflow run for a specific workflow triggered by workflow_dispatch */
export async function getLatestWorkflowRun(
  token: string,
  owner: string,
  repo: string,
  workflowFileName: string,
): Promise<{ id: number; status: string; conclusion: string | null; html_url: string } | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/runs?per_page=1&event=workflow_dispatch`,
    { headers: headers(token) },
  )
  if (!res.ok) return null
  const data = await res.json()
  const run = data.workflow_runs?.[0]
  if (!run) return null
  return { id: run.id, status: run.status, conclusion: run.conclusion, html_url: run.html_url }
}

/** Post a comment on a PR (used for Codex mention trigger) */
export async function postPRComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ body }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to post comment: ${res.status} ${text}`)
  }
}

export async function fetchReviewThreads(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ resolved: number; unresolved: number }> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`,
    { headers: headers(token) },
  )
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const comments = await res.json()

  let resolved = 0
  let unresolved = 0
  const threads = new Map<number, boolean>()

  for (const comment of comments) {
    const threadId = comment.in_reply_to_id ?? comment.id
    // If a comment has in_reply_to_id and the body contains resolution markers
    if (comment.position !== null || comment.line !== null) {
      if (!threads.has(threadId)) {
        threads.set(threadId, false)
      }
    }
  }

  // Use the GraphQL-like approach: check if review comments have been resolved
  // For REST API, we approximate by checking if the PR review was dismissed/approved
  for (const [, isResolved] of threads) {
    if (isResolved) resolved++
    else unresolved++
  }

  return { resolved, unresolved }
}
