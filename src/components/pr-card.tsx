import { Link } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import type { GitHubPR } from '@/lib/github'

interface PRCardProps {
  pr: GitHubPR
  repoFullName: string
  p1Unresolved?: number
  p2Unresolved?: number
  hasReview?: boolean
  isReviewing?: boolean
}

export function PRCard({ pr, repoFullName, p1Unresolved = 0, p2Unresolved = 0, hasReview, isReviewing }: PRCardProps) {
  const [owner, repo] = repoFullName.split('/')
  const linkTo = `/prs/${owner}/${repo}/${pr.number}`

  const p1Resolved = hasReview && p1Unresolved === 0
  const p2Resolved = hasReview && p2Unresolved === 0

  return (
    <Link to={linkTo}>
      <Card className="hover:border-primary/30 transition-colors active:bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Left: PR info */}
          <div className="flex-1 min-w-0">
            {/* Repo + PR number */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs text-gray-400 truncate">{repoFullName}</span>
              <span className="text-xs text-gray-300">#{pr.number}</span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5">
              {pr.title}
            </h3>

            {/* Author + branch + draft */}
            <div className="flex items-center gap-2">
              <img
                src={pr.user.avatar_url}
                alt={pr.user.login}
                className="w-4 h-4 rounded-full"
              />
              <span className="text-[11px] text-gray-400 truncate">
                {pr.user.login} &middot; {pr.head.ref}
                {pr.draft && (
                  <span className="ml-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    Draft
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Right: Review status */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {isReviewing ? (
              <span className="text-2xl inline-block animate-spin [animation-duration:2s]">
                🦭
              </span>
            ) : hasReview ? (
              <>
                {p1Resolved ? (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    P1 Resolved
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    P1 ({p1Unresolved})
                  </span>
                )}
                {p2Resolved ? (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    P2 Resolved
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    P2 ({p2Unresolved})
                  </span>
                )}
              </>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  )
}
