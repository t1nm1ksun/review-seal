import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Github, TestTube2 } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGitHub, enterDemoMode } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/prs" />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Seal</h1>
          <p className="text-gray-500 text-sm">
            AI-powered code reviews on the go
          </p>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={signInWithGitHub}
          >
            <Github size={20} />
            Sign in with GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface-dim px-2 text-gray-400">or</span>
            </div>
          </div>

          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={enterDemoMode}
          >
            <TestTube2 size={20} />
            Test without authentication
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Demo mode uses sample data to preview the UI.
          <br />
          Sign in with GitHub for full functionality.
        </p>
      </div>
    </div>
  )
}
