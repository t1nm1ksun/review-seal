import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import { DesktopSidebar } from '@/components/desktop-sidebar'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouterState()
  const isAuthRoute = router.location.pathname.startsWith('/login') ||
    router.location.pathname.startsWith('/auth')

  // Keep nav visible during loading if not on auth routes
  const showNav = (isAuthenticated || isLoading) && !isAuthRoute

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
