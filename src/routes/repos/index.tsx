import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Check, Plus, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserRepos } from '@/lib/github'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { DEMO_REPOS } from '@/lib/demo-data'

export const Route = createFileRoute('/repos/')({
  component: ReposPage,
})

interface RepoItem {
  id: number
  full_name: string
  owner: { login: string; avatar_url: string }
  name: string
  description: string | null
  private: boolean
}

function ReposPage() {
  const { githubToken, user, isDemoMode } = useAuth()
  const [search, setSearch] = useState('')
  const [demoMonitored, setDemoMonitored] = useState<Set<string>>(
    new Set(DEMO_REPOS.map(r => r.full_name)),
  )
  const queryClient = useQueryClient()

  const { data: githubRepos, isLoading: loadingRepos } = useQuery({
    queryKey: ['github-repos', isDemoMode ? 'demo' : githubToken],
    queryFn: async (): Promise<RepoItem[]> => {
      if (isDemoMode) {
        return DEMO_REPOS.map((r, i) => ({
          id: i + 1,
          full_name: r.full_name,
          owner: { login: r.owner, avatar_url: r.avatar_url },
          name: r.name,
          description: `Demo repository: ${r.full_name}`,
          private: i % 2 === 0,
        }))
      }
      return fetchUserRepos(githubToken!)
    },
    enabled: isDemoMode || !!githubToken,
  })

  const { data: monitored } = useQuery({
    queryKey: ['monitored-repos', user?.id],
    queryFn: async () => {
      if (isDemoMode) return []
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('monitored_repos')
        .select('*')
        .eq('user_id', user!.id)
      return data ?? []
    },
    enabled: !!user && !isDemoMode,
  })

  const monitoredIds = isDemoMode
    ? demoMonitored
    : new Set(monitored?.map(r => r.full_name) ?? [])

  const toggleRepo = useMutation({
    mutationFn: async (repo: RepoItem) => {
      if (isDemoMode) {
        setDemoMonitored(prev => {
          const next = new Set(prev)
          if (next.has(repo.full_name)) {
            next.delete(repo.full_name)
          } else {
            next.add(repo.full_name)
          }
          return next
        })
        return
      }

      const { supabase } = await import('@/lib/supabase')
      const isMonitored = monitoredIds.has(repo.full_name)
      if (isMonitored) {
        await supabase
          .from('monitored_repos')
          .delete()
          .eq('user_id', user!.id)
          .eq('full_name', repo.full_name)
      } else {
        await supabase
          .from('monitored_repos')
          .insert({
            user_id: user!.id,
            github_repo_id: repo.id,
            owner: repo.owner.login,
            name: repo.name,
            full_name: repo.full_name,
            avatar_url: repo.owner.avatar_url,
          })
      }
    },
    onSuccess: () => {
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ['monitored-repos'] })
      }
    },
    onError: () => {
      toast.error('Failed to update repo')
    },
  })

  const filtered = githubRepos?.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()),
  ) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        Repositories
        {isDemoMode && (
          <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Demo
          </span>
        )}
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Select repositories to monitor for PRs
      </p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {monitoredIds.size > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          {monitoredIds.size} repositories monitored
        </p>
      )}

      {loadingRepos ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(repo => {
            const isMonitored = monitoredIds.has(repo.full_name)
            return (
              <Card
                key={repo.full_name}
                className={cn(
                  'flex items-center gap-3 cursor-pointer transition-colors',
                  isMonitored && 'border-primary/30 bg-primary/5',
                )}
                onClick={() => toggleRepo.mutate(repo)}
              >
                <img
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {repo.full_name}
                  </p>
                  {repo.description && (
                    <p className="text-xs text-gray-500 truncate">{repo.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {isMonitored ? (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <Plus size={14} className="text-gray-400" />
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
