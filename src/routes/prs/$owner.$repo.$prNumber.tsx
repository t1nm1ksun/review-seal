import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Play, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'
import { fetchPRDetail, fetchPRFiles, checkWorkflowExists, createOrUpdateFile, triggerWorkflowDispatch, postPRComment } from '@/lib/github'
import { WORKFLOW_FILE_NAME, WORKFLOW_PATH, WORKFLOW_CONTENT } from '@/lib/seal-workflow'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DiffViewer } from '@/components/diff-viewer'
import { ReviewResult } from '@/components/review-result'
import { BottomSheet } from '@/components/bottom-sheet'
import { AiProviderToggle } from '@/components/ai-provider-toggle'
import { timeAgo } from '@/lib/utils'
import { DEMO_PRS, DEMO_PR_FILES, DEMO_REVIEW_COMMENTS, DEMO_REVIEW_SUMMARY } from '@/lib/demo-data'
import { SealLoading } from '@/components/seal-loading'
import { markReviewing, unmarkReviewing, prKey } from '@/contexts/reviewing-store'
import type { AiProvider } from '@/types/review'
import { toast } from 'sonner'

export const Route = createFileRoute('/prs/$owner/$repo/$prNumber')({
  component: PRDetailPage,
})

function PRDetailPage() {
  const { owner, repo, prNumber } = Route.useParams()
  const prNum = Number(prNumber)
  const { githubToken, user, isDemoMode } = useAuth()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'diff' | 'review'>('diff')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [provider, setProvider] = useState<AiProvider>('claude-code')
  const [customInstructions, setCustomInstructions] = useState('')
  const [demoReviewState, setDemoReviewState] = useState<'none' | 'running' | 'completed' | 'posted'>('none')
  const [draftConfirmed, setDraftConfirmed] = useState(false)

  // PR data
  const { data: pr, isLoading: loadingPR } = useQuery({
    queryKey: ['pr-detail', owner, repo, prNum],
    queryFn: () => {
      if (isDemoMode) {
        const demoPr = DEMO_PRS.find(
          p => p._repoFullName === `${owner}/${repo}` && p.number === prNum,
        )
        return demoPr ?? DEMO_PRS[0]
      }
      return fetchPRDetail(githubToken!, owner, repo, prNum)
    },
    enabled: isDemoMode || !!githubToken,
  })

  // PR files
  const { data: files } = useQuery({
    queryKey: ['pr-files', owner, repo, prNum],
    queryFn: () => {
      if (isDemoMode) return DEMO_PR_FILES
      return fetchPRFiles(githubToken!, owner, repo, prNum)
    },
    enabled: isDemoMode || !!githubToken,
  })

  // Settings
  const { data: settings } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (isDemoMode) {
        return { default_provider: 'claude-code' }
      }
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      return data
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (settings?.default_provider) {
      setProvider(settings.default_provider as AiProvider)
    }
  }, [settings])

  // Latest review
  const { data: latestReview } = useQuery({
    queryKey: ['latest-review', owner, repo, prNum, demoReviewState],
    queryFn: async () => {
      if (isDemoMode) {
        if (demoReviewState === 'none') return null
        return {
          id: 'demo-review-1',
          status: demoReviewState,
          summary: demoReviewState === 'completed' || demoReviewState === 'posted'
            ? DEMO_REVIEW_SUMMARY : null,
          error_message: null,
        }
      }
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user!.id)
        .eq('repo_full_name', `${owner}/${repo}`)
        .eq('pr_number', prNum)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return data
    },
    enabled: !!user,
  })

  // Review comments
  const { data: reviewComments } = useQuery({
    queryKey: ['review-comments', latestReview?.id, demoReviewState],
    queryFn: async () => {
      if (isDemoMode) {
        return demoReviewState === 'completed' || demoReviewState === 'posted'
          ? DEMO_REVIEW_COMMENTS : []
      }
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('review_comments')
        .select('*')
        .eq('review_id', latestReview!.id)
        .order('file_path')
      return data ?? []
    },
    enabled: isDemoMode
      ? (demoReviewState === 'completed' || demoReviewState === 'posted')
      : (!!latestReview?.id && latestReview.status === 'completed'),
  })

  // Sync review status with global store + toast on completion (non-demo)
  const prevStatusRef = useState<string | null>(null)
  useEffect(() => {
    if (isDemoMode) return
    const key = prKey(`${owner}/${repo}`, prNum)
    const status = latestReview?.status ?? null
    if (status === 'running' || status === 'pending') {
      markReviewing(key)
    } else {
      unmarkReviewing(key)
    }
    if (status === 'completed' && (prevStatusRef[0] === 'running' || prevStatusRef[0] === 'pending')) {
      toast.success(`#${prNum} PR review completed!`)
    }
    prevStatusRef[1](status)
    return () => { unmarkReviewing(key) }
  }, [isDemoMode, latestReview?.status, owner, repo, prNum])

  // Realtime subscription (non-demo only)
  useEffect(() => {
    if (isDemoMode || !latestReview?.id || latestReview.status !== 'running') return

    const initRealtime = async () => {
      const { supabase } = await import('@/lib/supabase')
      const channel = supabase
        .channel(`review-${latestReview.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'reviews',
            filter: `id=eq.${latestReview.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['latest-review'] })
            queryClient.invalidateQueries({ queryKey: ['review-comments'] })
          },
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    const cleanup = initRealtime()
    return () => { cleanup.then(fn => fn?.()) }
  }, [isDemoMode, latestReview?.id, latestReview?.status, queryClient])

  // Start review
  const startReview = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        // Simulate review running
        const key = prKey(`${owner}/${repo}`, prNum)
        setDemoReviewState('running')
        markReviewing(key)
        setSheetOpen(false)
        setTab('review')
        await new Promise(r => setTimeout(r, 5_000))
        setDemoReviewState('completed')
        unmarkReviewing(key)
        return
      }

      if (!githubToken) throw new Error('GitHub token required')

      if (provider === 'claude-code') {
        // Check if workflow exists, install if not
        const exists = await checkWorkflowExists(githubToken, owner, repo, WORKFLOW_PATH)
        if (!exists) {
          await createOrUpdateFile(
            githubToken, owner, repo,
            WORKFLOW_PATH, WORKFLOW_CONTENT,
            'chore: add Review Seal workflow',
            pr?.base.ref ?? 'main',
          )
          await new Promise(r => setTimeout(r, 2_000))
        }

        await triggerWorkflowDispatch(
          githubToken, owner, repo,
          WORKFLOW_FILE_NAME,
          pr?.head.ref ?? 'main',
          {
            pr_number: String(prNum),
            custom_instructions: customInstructions || '',
          },
        )
      } else {
        // Codex: post a mention comment on the PR
        let body = '@openai-codex review this PR.'
        if (customInstructions) {
          body += `\n\n${customInstructions}`
        }
        await postPRComment(githubToken, owner, repo, prNum, body)
      }
    },
    onSuccess: () => {
      setSheetOpen(false)
      setCustomInstructions('')
      if (isDemoMode) {
        setTab('review')
        toast.success(`#${prNum} PR review completed!`)
      } else {
        const label = provider === 'claude-code' ? 'Claude Code' : 'Codex'
        toast.success(`${label} review triggered! Check the PR on GitHub.`)
      }
    },
    onError: (err) => {
      toast.error(`Failed to start review: ${err.message}`)
    },
  })

  if (loadingPR) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    )
  }

  if (!pr) {
    return <div className="p-4 text-center text-gray-500">PR not found</div>
  }

  const reviewStatus = isDemoMode ? demoReviewState : latestReview?.status

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/prs" className="p-1 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 line-clamp-1">
            {pr.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{owner}/{repo} #{prNum}</span>
            <span>{pr.user.login}</span>
            <span>{timeAgo(pr.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* PR Meta */}
      <div className="flex items-center gap-2 mb-4 text-xs flex-wrap">
        <Badge>{pr.head.ref} &rarr; {pr.base.ref}</Badge>
        <span className="text-emerald-600">+{pr.additions}</span>
        <span className="text-red-600">-{pr.deletions}</span>
        <span className="text-gray-500">{pr.changed_files} files</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'diff' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
          onClick={() => setTab('diff')}
        >
          Diff
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'review' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
          onClick={() => setTab('review')}
        >
          Review
          {reviewStatus === 'running' && (
            <Loader2 size={12} className="inline ml-1 animate-spin" />
          )}
        </button>
      </div>

      {/* Content */}
      {tab === 'diff' && files && <DiffViewer files={files} />}
      {tab === 'review' && (
        <div>
          {reviewStatus === 'running' && (
            <SealLoading message="AI is reviewing your PR..." />
          )}

          {reviewStatus === 'failed' && (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-2">Review failed</p>
              <p className="text-xs text-gray-500">{latestReview?.error_message}</p>
            </div>
          )}

          {reviewStatus === 'completed' && reviewComments && (
            <ReviewResult
              summary={isDemoMode ? DEMO_REVIEW_SUMMARY : latestReview?.summary ?? null}
              comments={reviewComments as any}
            />
          )}

          {(!reviewStatus || reviewStatus === 'none' || reviewStatus === 'failed') && (
            <div className="text-center py-8">
              {(!reviewStatus || reviewStatus === 'none') && (
                <>
                  <p className="text-sm text-gray-500 mb-3">No reviews yet for this PR</p>
                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline"
                  >
                    View on GitHub
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Start Review FAB */}
      <button
        className="fixed bottom-[calc(var(--bottom-bar-height)+var(--safe-area-bottom)+0.5rem)] md:bottom-6 right-4 md:right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark active:scale-95 transition-all z-40"
        onClick={() => setSheetOpen(true)}
      >
        <Play size={22} />
      </button>

      {/* Review Config Bottom Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Start Review"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              AI Provider
            </label>
            <AiProviderToggle value={provider} onChange={setProvider} />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            {provider === 'claude-code' ? (
              <p className="text-xs text-blue-700">
                Runs via GitHub Actions with full repo access.
                Requires <code className="bg-blue-100 px-1 rounded">ANTHROPIC_API_KEY</code> secret in the repo.
              </p>
            ) : (
              <p className="text-xs text-blue-700">
                Mentions <code className="bg-blue-100 px-1 rounded">@openai-codex</code> on the PR.
                Requires Codex GitHub App installed on the repo.
              </p>
            )}
            <p className="text-xs text-blue-600 mt-1">Results are posted directly as a PR comment.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Additional Instructions (optional)
            </label>
            <Textarea
              placeholder="e.g., Focus on security issues, check for SQL injection..."
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {pr?.draft && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draftConfirmed}
                onChange={e => setDraftConfirmed(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-amber-600">
                This PR is a draft. Review anyway?
              </span>
            </label>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={() => startReview.mutate()}
            disabled={startReview.isPending || (pr?.draft && !draftConfirmed)}
          >
            {startReview.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            Start Review
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
