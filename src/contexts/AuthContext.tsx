/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { toast } from 'sonner'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  github_url: string | null
}

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  githubToken: string | null
  isDemoMode: boolean
}

interface AuthContextType extends AuthState {
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  enterDemoMode: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  username: 'demo',
  display_name: 'Demo User',
  avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=demo',
  github_url: 'https://github.com/demo',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    githubToken: null,
    isDemoMode: false,
  })

  // Check if Supabase is configured
  const supabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
  )

  useEffect(() => {
    if (!supabaseConfigured) {
      // No Supabase configured - go straight to unauthenticated (fast)
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    let mounted = true

    const initAuth = async () => {
      const { supabase } = await import('@/lib/supabase')

      const buildProfile = (user: User): Profile => {
        const meta = user.user_metadata
        return {
          id: user.id,
          username: meta?.user_name ?? meta?.preferred_username ?? user.email?.split('@')[0] ?? 'user',
          display_name: meta?.full_name ?? meta?.name ?? null,
          avatar_url: meta?.avatar_url ?? null,
          github_url: meta?.user_name ? `https://github.com/${meta.user_name}` : null,
        }
      }

      const resolveSession = async (session: Session) => {
        const profile = buildProfile(session.user)
        let providerToken = session.provider_token ?? null

        try {
          if (providerToken) {
            await supabase
              .from('user_settings')
              .upsert({
                user_id: session.user.id,
                github_token_encrypted: providerToken,
              }, { onConflict: 'user_id' })
          } else {
            const { data: settings } = await supabase
              .from('user_settings')
              .select('github_token_encrypted')
              .eq('user_id', session.user.id)
              .single()
            providerToken = settings?.github_token_encrypted ?? null
          }
        } catch {
          // continue without token
        }

        if (!mounted) return
        setState({
          user: session.user,
          profile,
          session,
          isLoading: false,
          isAuthenticated: true,
          githubToken: providerToken,
          isDemoMode: false,
        })
      }

      // Explicitly check existing session first (handles refresh)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await resolveSession(session)
      } else if (mounted) {
        setState(prev => ({ ...prev, isLoading: false }))
      }

      // Listen for future auth changes (sign in, sign out, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) await resolveSession(session)
          } else if (event === 'SIGNED_OUT') {
            setState({
              user: null,
              profile: null,
              session: null,
              isLoading: false,
              isAuthenticated: false,
              githubToken: null,
              isDemoMode: false,
            })
          }
        },
      )

      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }

    const cleanup = initAuth()
    return () => {
      mounted = false
      cleanup.then(fn => fn?.())
    }
  }, [supabaseConfigured])

  const signInWithGitHub = useCallback(async () => {
    if (!supabaseConfigured) {
      toast.error('Supabase not configured. Use demo mode instead.')
      return
    }
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'repo read:user',
      },
    })
    if (error) toast.error(`GitHub login failed: ${error.message}`)
  }, [supabaseConfigured])

  const signOut = useCallback(async () => {
    if (state.isDemoMode) {
      setState({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        githubToken: null,
        isDemoMode: false,
      })
      return
    }
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(`Sign out failed: ${error.message}`)
    } else {
      setState({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        githubToken: null,
        isDemoMode: false,
      })
      window.location.href = '/login'
    }
  }, [state.isDemoMode])

  const refreshProfile = useCallback(async () => {
    // no-op in demo mode
  }, [])

  const enterDemoMode = useCallback(() => {
    setState({
      user: { id: 'demo-user' } as User,
      profile: DEMO_PROFILE,
      session: null,
      isLoading: false,
      isAuthenticated: true,
      githubToken: 'demo-token',
      isDemoMode: true,
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{ ...state, signInWithGitHub, signOut, refreshProfile, enterDemoMode }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
