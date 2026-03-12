import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, LogOut, Loader2, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { AiProviderToggle } from '@/components/ai-provider-toggle'
import { maskApiKey } from '@/lib/utils'
import type { AiProvider } from '@/types/review'
import { toast } from 'sonner'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, profile, signOut, isDemoMode } = useAuth()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          default_provider: 'claude-code',
          github_token_encrypted: null,
        }
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

  const [provider, setProvider] = useState<AiProvider>('claude-code')
  const [githubPat, setGithubPat] = useState('')

  // Review rules
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleContent, setNewRuleContent] = useState('')
  const [expandedRule, setExpandedRule] = useState<string | null>(null)

  const { data: rules } = useQuery({
    queryKey: ['review-rules', user?.id],
    queryFn: async () => {
      if (isDemoMode) {
        return [
          {
            id: 'demo-rule-1',
            name: 'Frontend Best Practices',
            content: '- Assume yourself as a principal frontend engineer with expertise in React, Next.js, and Vercel best practices\n- Review for reuse, quality, and efficiency, then fix any issues found',
            is_active: true,
          },
        ]
      }
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('review_rules')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at')
      return data ?? []
    },
    enabled: !!user,
  })

  const addRule = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300))
        return
      }
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.from('review_rules').insert({
        user_id: user!.id,
        name: newRuleName,
        content: newRuleContent,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewRuleName('')
      setNewRuleContent('')
      queryClient.invalidateQueries({ queryKey: ['review-rules'] })
      toast.success('Rule added')
    },
    onError: () => toast.error('Failed to add rule'),
  })

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (isDemoMode) return
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('review_rules')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['review-rules'] }),
  })

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) return
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.from('review_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-rules'] })
      toast.success('Rule deleted')
    },
    onError: () => toast.error('Failed to delete rule'),
  })

  useEffect(() => {
    if (settings) {
      setProvider(settings.default_provider as AiProvider)
    }
  }, [settings])

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 500))
        return
      }
      const { supabase } = await import('@/lib/supabase')
      const updates: {
        user_id: string
        default_provider: string
        github_token_encrypted?: string
      } = {
        user_id: user!.id,
        default_provider: provider,
      }

      if (githubPat) updates.github_token_encrypted = githubPat

      const { error } = await supabase
        .from('user_settings')
        .upsert(updates, { onConflict: 'user_id' })

      if (error) throw error
    },
    onSuccess: () => {
      setGithubPat('')
      queryClient.invalidateQueries({ queryKey: ['user-settings'] })
      toast.success('Settings saved')
    },
    onError: () => {
      toast.error('Failed to save settings')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">
        Settings
        {isDemoMode && (
          <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Demo
          </span>
        )}
      </h1>

      {/* Account */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Account</h2>
        <div className="flex items-center gap-3 mb-3">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full" />
          )}
          <div>
            <p className="text-sm font-medium">{profile?.display_name || profile?.username}</p>
            <p className="text-xs text-gray-500">@{profile?.username}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut size={14} />
          {isDemoMode ? 'Exit Demo' : 'Sign Out'}
        </Button>
      </Card>

      {/* GitHub Token (PAT Fallback) */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">GitHub Token</h2>
        <p className="text-xs text-gray-500 mb-3">
          OAuth token is stored automatically. Enter a PAT here as fallback if needed.
        </p>
        {settings?.github_token_encrypted && (
          <p className="text-xs text-gray-400 mb-2">
            Current: {maskApiKey(settings.github_token_encrypted)}
          </p>
        )}
        <Input
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          value={githubPat}
          onChange={e => setGithubPat(e.target.value)}
        />
      </Card>

      {/* Default Provider */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Default AI Provider</h2>
        <AiProviderToggle value={provider} onChange={setProvider} />
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          {provider === 'claude-code' ? (
            <p className="text-xs text-blue-700">
              Runs via GitHub Actions with full repo access.
              Add <code className="bg-blue-100 px-1 rounded">ANTHROPIC_API_KEY</code> to each repo's secrets.
            </p>
          ) : (
            <p className="text-xs text-blue-700">
              Mentions <code className="bg-blue-100 px-1 rounded">@openai-codex</code> on the PR.
              Install the Codex GitHub App on each repo.
            </p>
          )}
        </div>
      </Card>

      {/* Review Rules */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Review Rules</h2>
        <p className="text-xs text-gray-500 mb-3">
          Markdown rules included as instructions when triggering reviews.
        </p>

        {/* Existing rules */}
        {rules && rules.length > 0 && (
          <div className="space-y-2 mb-4">
            {rules.map(rule => (
              <div key={rule.id} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    className="flex-shrink-0 text-gray-400"
                    onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                  >
                    {expandedRule === rule.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={e => toggleRule.mutate({ id: rule.id, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className={`text-sm truncate ${rule.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {rule.name}
                    </span>
                  </label>
                  <button
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500"
                    onClick={() => deleteRule.mutate(rule.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {expandedRule === rule.id && (
                  <div className="px-3 pb-3 border-t border-border">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-2 font-mono">{rule.content}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new rule */}
        <div className="space-y-2 border-t border-border pt-3">
          <Input
            placeholder="Rule name (e.g. Security Rules)"
            value={newRuleName}
            onChange={e => setNewRuleName(e.target.value)}
          />
          <Textarea
            placeholder={"- Check for SQL injection\n- Verify JWT token validation\n- Ensure CORS is configured"}
            value={newRuleContent}
            onChange={e => setNewRuleContent(e.target.value)}
            rows={4}
            className="font-mono text-xs"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addRule.mutate()}
            disabled={!newRuleName.trim() || !newRuleContent.trim() || addRule.isPending}
          >
            <Plus size={14} />
            Add Rule
          </Button>
        </div>
      </Card>

      {/* Save */}
      <Button
        size="lg"
        className="w-full"
        onClick={() => saveSettings.mutate()}
        disabled={saveSettings.isPending}
      >
        {saveSettings.isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        Save Settings
      </Button>
    </div>
  )
}
