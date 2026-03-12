import { useEffect } from 'react'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { Toaster, toast } from 'sonner'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import { DesktopSidebar } from '@/components/desktop-sidebar'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouterState()
  const isAuthRoute = router.location.pathname.startsWith('/login') ||
    router.location.pathname.startsWith('/auth')

  // Keep nav visible during loading if not on auth routes
  const showNav = (isAuthenticated || isLoading) && !isAuthRoute

  // Subscribe to review notifications via Supabase Realtime
  useEffect(() => {
    if (!isAuthenticated || !user) return

    let cleanup: (() => void) | undefined

    const init = async () => {
      const { supabase } = await import('@/lib/supabase')
      const channel = supabase
        .channel('review-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'review_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as {
              repo_full_name: string
              pr_number: number
              pr_title: string
              severity: string
            }
            toast.success(
              `🦭 Review done! ${n.severity} found on ${n.repo_full_name}#${n.pr_number}`,
              { description: n.pr_title, duration: 8000 },
            )
          },
        )
        .subscribe()

      cleanup = () => { supabase.removeChannel(channel) }
    }

    init()
    return () => { cleanup?.() }
  }, [isAuthenticated, user])

  return (
    <>
      <Toaster position="top-center" richColors />
      {showNav && <DesktopSidebar />}
      <main
        className={showNav ? 'md:ml-60 pb-[calc(var(--bottom-bar-height)+var(--safe-area-bottom))] md:pb-0' : ''}
      >
        <Outlet />
      </main>
      {showNav && <BottomTabBar />}
    </>
  )
}
