import { Link, useRouterState } from '@tanstack/react-router'
import { GitPullRequestArrow, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/prs', label: 'Pull Requests', icon: GitPullRequestArrow },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function DesktopSidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { signOut, profile } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen border-r border-border bg-white fixed left-0 top-0">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <span className="text-xl font-bold">Review Seal</span>
      </div>
      <nav className="flex-1 py-3 px-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border px-3 py-3">
        {profile && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            {profile.avatar_url && (
              <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
            )}
            <span className="text-sm text-gray-700 truncate">{profile.username}</span>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 w-full"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
