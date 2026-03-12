import type { GitHubPR, PRFile } from '@/lib/github'
import type { Severity } from '@/types/review'

const now = new Date()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()

export const DEMO_REPOS = [
  { full_name: 'acme/web-app', owner: 'acme', name: 'web-app', avatar_url: 'https://api.dicebear.com/9.x/identicon/svg?seed=acme' },
  { full_name: 'acme/api-server', owner: 'acme', name: 'api-server', avatar_url: 'https://api.dicebear.com/9.x/identicon/svg?seed=api' },
  { full_name: 'minseok/review-seal', owner: 'minseok', name: 'review-seal', avatar_url: 'https://api.dicebear.com/9.x/identicon/svg?seed=seal' },
]

export const DEMO_PRS: (GitHubPR & { _repoFullName: string; _p1Unresolved: number; _p2Unresolved: number; _hasReview: boolean })[] = [
  {
    id: 1001,
    number: 142,
    title: 'feat: Add user authentication with OAuth2 provider support',
    body: 'Implements OAuth2 authentication flow with GitHub and Google providers.',
    state: 'open',
    html_url: '#',
    created_at: hoursAgo(48),
    updated_at: hoursAgo(2),
    user: { login: 'alice', avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice' },
    head: { ref: 'feat/oauth-auth', sha: 'abc123' },
    base: { ref: 'main' },
    changed_files: 12,
    additions: 487,
    deletions: 23,
    draft: false,
    _repoFullName: 'acme/web-app',
    _p1Unresolved: 2,
    _p2Unresolved: 3,
    _hasReview: true,
  },
  {
    id: 1002,
    number: 89,
    title: 'fix: Resolve race condition in WebSocket connection handler',
    body: 'Fixes a critical race condition that caused dropped messages during reconnection.',
    state: 'open',
    html_url: '#',
    created_at: hoursAgo(24),
    updated_at: hoursAgo(1),
    user: { login: 'bob', avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob' },
    head: { ref: 'fix/ws-race-condition', sha: 'def456' },
    base: { ref: 'main' },
    changed_files: 4,
    additions: 67,
    deletions: 31,
    draft: false,
    _repoFullName: 'acme/api-server',
    _p1Unresolved: 0,
    _p2Unresolved: 0,
    _hasReview: true,
  },
  {
    id: 1003,
    number: 256,
    title: 'refactor: Migrate database queries from raw SQL to Prisma ORM',
    body: 'Large refactor migrating all database operations to use Prisma for type safety.',
    state: 'open',
    html_url: '#',
    created_at: hoursAgo(72),
    updated_at: hoursAgo(5),
    user: { login: 'charlie', avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=charlie' },
    head: { ref: 'refactor/prisma-migration', sha: 'ghi789' },
    base: { ref: 'develop' },
    changed_files: 38,
    additions: 1243,
    deletions: 892,
    draft: false,
    _repoFullName: 'acme/web-app',
    _p1Unresolved: 4,
    _p2Unresolved: 5,
    _hasReview: true,
  },
  {
    id: 1004,
    number: 15,
    title: 'feat: Add PR diff viewer with syntax highlighting',
    body: 'Adds a unified diff viewer component optimized for mobile.',
    state: 'open',
    html_url: '#',
    created_at: hoursAgo(12),
    updated_at: hoursAgo(0.5),
    user: { login: 'minseok', avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=minseok' },
    head: { ref: 'feat/diff-viewer', sha: 'jkl012' },
    base: { ref: 'main' },
    changed_files: 6,
    additions: 234,
    deletions: 12,
    draft: false,
    _repoFullName: 'minseok/review-seal',
    _p1Unresolved: 0,
    _p2Unresolved: 0,
    _hasReview: false,
  },
  {
    id: 1005,
    number: 90,
    title: 'chore: Update dependencies and fix security vulnerabilities',
    body: 'Bumps all dependencies to latest versions, addressing 3 CVEs.',
    state: 'open',
    html_url: '#',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(3),
    user: { login: 'dependabot', avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=dependabot' },
    head: { ref: 'chore/dep-update', sha: 'mno345' },
    base: { ref: 'main' },
    changed_files: 2,
    additions: 145,
    deletions: 132,
    draft: true,
    _repoFullName: 'acme/api-server',
    _p1Unresolved: 1,
    _p2Unresolved: 0,
    _hasReview: true,
  },
  {
    id: 1006,
    number: 257,
    title: 'feat: Implement real-time notification system with SSE',
    body: 'Server-Sent Events based notification system for live updates.',
    state: 'open',
    html_url: '#',
    created_at: hoursAgo(8),
    updated_at: hoursAgo(1.5),
    user: { login: 'alice', avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice' },
    head: { ref: 'feat/sse-notifications', sha: 'pqr678' },
    base: { ref: 'develop' },
    changed_files: 9,
    additions: 312,
    deletions: 45,
    draft: false,
    _repoFullName: 'acme/web-app',
    _p1Unresolved: 0,
    _p2Unresolved: 2,
    _hasReview: true,
  },
]

export const DEMO_PR_FILES: PRFile[] = [
  {
    sha: 'a1b2c3',
    filename: 'src/components/diff-viewer.tsx',
    status: 'added',
    additions: 120,
    deletions: 0,
    changes: 120,
    patch: `@@ -0,0 +1,42 @@
+import { useState } from 'react'
+import { ChevronDown, ChevronRight } from 'lucide-react'
+
+interface DiffViewerProps {
+  files: PRFile[]
+}
+
+export function DiffViewer({ files }: DiffViewerProps) {
+  return (
+    <div className="space-y-2">
+      {files.map(file => (
+        <DiffFile key={file.filename} file={file} />
+      ))}
+    </div>
+  )
+}
+
+function DiffFile({ file }: { file: PRFile }) {
+  const [expanded, setExpanded] = useState(false)
+
+  return (
+    <div className="border rounded-lg overflow-hidden">
+      <button
+        className="w-full flex items-center gap-2 px-3 py-2"
+        onClick={() => setExpanded(!expanded)}
+      >
+        {expanded ? <ChevronDown /> : <ChevronRight />}
+        <span className="font-mono text-sm">{file.filename}</span>
+      </button>
+    </div>
+  )
+}`,
  },
  {
    sha: 'd4e5f6',
    filename: 'src/lib/github.ts',
    status: 'modified',
    additions: 45,
    deletions: 12,
    changes: 57,
    patch: `@@ -23,8 +23,15 @@ export async function fetchPRFiles(
   return res.json()
 }

-export async function fetchPRDiff(token: string, owner: string, repo: string) {
-  const res = await fetch(\`/repos/\${owner}/\${repo}/pulls\`)
+export async function fetchPRDiff(
+  token: string,
+  owner: string,
+  repo: string,
+  prNumber: number,
+): Promise<string> {
+  const res = await fetch(
+    \`https://api.github.com/repos/\${owner}/\${repo}/pulls/\${prNumber}\`,
+    {
+      headers: {
+        Authorization: \`Bearer \${token}\`,
+        Accept: 'application/vnd.github.v3.diff',
+      },
+    },
+  )
   if (!res.ok) throw new Error(\`GitHub API error: \${res.status}\`)
-  return res.json()
+  return res.text()
 }`,
  },
  {
    sha: 'g7h8i9',
    filename: 'src/routes/prs/$prId.tsx',
    status: 'modified',
    additions: 69,
    deletions: 0,
    changes: 69,
    patch: `@@ -1,4 +1,5 @@
 import { useState } from 'react'
+import { DiffViewer } from '@/components/diff-viewer'
 import { createFileRoute } from '@tanstack/react-router'

@@ -42,6 +43,18 @@ function PRDetailPage() {
+      {/* Diff Tab */}
+      {tab === 'diff' && files && (
+        <DiffViewer files={files} />
+      )}
+
+      {/* Review Tab */}
+      {tab === 'review' && (
+        <div className="text-center py-8">
+          <p className="text-gray-500">
+            No reviews yet for this PR
+          </p>
+        </div>
+      )}`,
  },
]

export interface DemoReviewComment {
  id: string
  file_path: string
  start_line: number | null
  end_line: number | null
  body: string
  severity: Severity
}

export const DEMO_REVIEW_COMMENTS: DemoReviewComment[] = [
  {
    id: 'rc-1',
    file_path: 'src/components/diff-viewer.tsx',
    start_line: 8,
    end_line: 8,
    body: 'The `PRFile` type is used but not imported. Add `import type { PRFile } from \'@/lib/github\'` at the top.',
    severity: 'P1',
  },
  {
    id: 'rc-2',
    file_path: 'src/components/diff-viewer.tsx',
    start_line: 22,
    end_line: 28,
    body: 'Consider memoizing the expanded state per file to avoid re-renders when other files are toggled. Use `React.memo` or move state management to a parent component.',
    severity: 'P3',
  },
  {
    id: 'rc-3',
    file_path: 'src/lib/github.ts',
    start_line: 30,
    end_line: 35,
    body: 'The API token is being sent in the Authorization header which is correct. However, there\'s no error handling for expired tokens. Consider adding a token refresh mechanism.',
    severity: 'P2',
  },
  {
    id: 'rc-4',
    file_path: 'src/lib/github.ts',
    start_line: 26,
    end_line: 31,
    body: 'Good use of TypeScript generics with explicit return type `Promise<string>`. This makes the API contract clear.',
    severity: 'P5',
  },
  {
    id: 'rc-5',
    file_path: 'src/routes/prs/$prId.tsx',
    start_line: 47,
    end_line: 53,
    body: 'The empty state message could be more actionable. Consider adding a "Start Review" CTA button here instead of just text.',
    severity: 'P4',
  },
]

export const DEMO_REVIEW_SUMMARY = 'Overall the PR looks good. The diff viewer implementation is clean and follows existing patterns. Found 1 P1 (missing import), 1 P2 (token expiration), 1 P3 (memoization), 1 P4 (UX improvement), and 1 P5 (good TypeScript usage).'
