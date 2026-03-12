import { Link, useRouterState } from '@tanstack/react-router'
import { GitPullRequestArrow, Settings, BookMarked } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/prs', label: 'PRs', icon: GitPullRequestArrow },
  { to: '/repos', label: 'Repos', icon: BookMarked },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function BottomTabBar() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="flex items-center justify-around h-[var(--bottom-bar-height)]">
        {tabs.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1 transition-colors',
                isActive ? 'text-primary' : 'text-gray-400',
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
