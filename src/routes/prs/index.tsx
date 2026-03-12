import { useState, useRef, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Inbox, ChevronDown, Search, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchPullRequests, type GitHubPR } from '@/lib/github'
import { PRCard } from '@/components/pr-card'
import { DEMO_PRS, DEMO_REPOS } from '@/lib/demo-data'
import { useReviewingPRs } from '@/contexts/reviewing-store'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/prs/')({
  component: PRsPage,
})

interface PRWithRepo extends GitHubPR {
  _repoFullName: string
  _p1Unresolved?: number
  _p2Unresolved?: number
  _hasReview?: boolean
}

function PRsPage() {
  const { githubToken, user, isDemoMode } = useAuth()
  const reviewingPRs = useReviewingPRs()

  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [selectedRepos, setSelectedRepos] = useState<Set<string> | null>(null) // null = all
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRepoDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Monitored repos
  const { data: monitored } = useQuery({
    queryKey: ['monitored-repos', user?.id],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('monitored_repos')
        .select('*')
        .eq('user_id', user!.id)
      return data ?? []
    },
    enabled: !!user && !isDemoMode,
  })

  const monitoredNames = isDemoMode
    ? new Set(DEMO_REPOS.map(r => r.full_name))
    : new Set(monitored?.map(r => r.full_name) ?? [])

  // PRs from monitored repos
  const { data: prs, isLoading } = useQuery({
    queryKey: ['all-prs', isDemoMode ? 'demo' : monitored?.map(r => r.full_name)],
    queryFn: async (): Promise<PRWithRepo[]> => {
      if (isDemoMode) return DEMO_PRS

      if (!monitored || !githubToken) return []
      const results: PRWithRepo[] = []

      await Promise.all(
        monitored.map(async repo => {
          try {
            const repoPrs = await fetchPullRequests(githubToken, repo.owner, repo.name)
            for (const pr of repoPrs) {
              results.push({ ...pr, _repoFullName: repo.full_name })
            }
          } catch {
            // skip failed repos
          }
        }),
      )

      return results.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
    },
    enabled: isDemoMode || (!!monitored && monitored.length > 0 && !!githubToken),
  })

  const filteredPrs = selectedRepos
    ? prs?.filter(pr => selectedRepos.has((pr as PRWithRepo)._repoFullName))
    : prs

  const monitoredRepoList = [...monitoredNames].filter(name =>
    name.toLowerCase().includes(repoSearch.toLowerCase()),
  )

  const allSelected = !selectedRepos

  function toggleRepo(name: string) {
    setSelectedRepos(prev => {
      // If currently "all", start with all checked except this one
      if (!prev) {
        const next = new Set(monitoredNames)
        next.delete(name)
        return next
      }
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      // If all are selected, go back to null (= all)
      if (next.size === monitoredNames.size) return null
      return next
    })
  }

  function toggleAll() {
    setSelectedRepos(prev => prev === null ? new Set<string>() : null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      {/* Header with repo dropdown */}
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          PRs
          {isDemoMode && (
            <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Demo
            </span>
          )}
        </h1>

        {/* Repo filter dropdown */}
        <div className="relative ml-auto" ref={dropdownRef}>
          <button
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
              !allSelected
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border text-gray-600 hover:bg-gray-50',
            )}
            onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
          >
            {allSelected
              ? `All repos (${monitoredNames.size})`
              : `${selectedRepos!.size} repos`}
            <ChevronDown size={12} />
          </button>

          {repoDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-border rounded-lg shadow-lg z-50 max-h-80 flex flex-col">
              {/* Search */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search repos..."
                    value={repoSearch}
                    onChange={e => setRepoSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Repo list */}
              <div className="overflow-y-auto flex-1 py-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                  onClick={toggleAll}
                >
                  <span className="w-3.5 flex-shrink-0">
                    {allSelected && <Check size={14} className="text-primary" />}
                  </span>
                  All repos
                </button>

                {monitoredRepoList.map(name => {
                  const isChecked = allSelected || selectedRepos!.has(name)
                  return (
                    <button
                      key={name}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                      onClick={() => toggleRepo(name)}
                    >
                      <span className="w-3.5 flex-shrink-0">
                        {isChecked && <Check size={14} className="text-primary" />}
                      </span>
                      <span className="truncate">{name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PR list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : !filteredPrs || filteredPrs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox size={40} className="mb-3" />
          <p className="text-sm">No open pull requests</p>
          {monitoredNames.size === 0 && !isDemoMode && (
            <p className="text-xs mt-1">Add repositories from the dropdown above</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPrs.map(pr => (
            <PRCard
              key={`${(pr as PRWithRepo)._repoFullName}-${pr.number}`}
              pr={pr}
              repoFullName={(pr as PRWithRepo)._repoFullName}
              p1Unresolved={(pr as PRWithRepo)._p1Unresolved}
              p2Unresolved={(pr as PRWithRepo)._p2Unresolved}
              hasReview={(pr as PRWithRepo)._hasReview}
              isReviewing={reviewingPRs.has(`${(pr as PRWithRepo)._repoFullName}#${pr.number}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
