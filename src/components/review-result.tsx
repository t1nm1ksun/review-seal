import { Card } from '@/components/ui/card'
import { Badge, SeverityBadge } from '@/components/ui/badge'
import type { Severity } from '@/types/review'

const SEVERITIES: Severity[] = ['P1', 'P2', 'P3', 'P4', 'P5']

interface ReviewComment {
  id: string
  file_path: string
  start_line: number | null
  end_line: number | null
  body: string
  severity: Severity
}

interface ReviewResultProps {
  summary: string | null
  comments: ReviewComment[]
}

export function ReviewResult({ summary, comments }: ReviewResultProps) {
  const grouped = comments.reduce<Record<string, ReviewComment[]>>((acc, c) => {
    if (!acc[c.file_path]) acc[c.file_path] = []
    acc[c.file_path].push(c)
    return acc
  }, {})

  const counts = SEVERITIES.reduce<Record<Severity, number>>((acc, s) => {
    acc[s] = comments.filter(c => c.severity === s).length
    return acc
  }, {} as Record<Severity, number>)

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <Card>
          <p className="text-sm text-gray-700">{summary}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {SEVERITIES.map(s => counts[s] > 0 && (
              <Badge key={s} variant={s}>{s} ({counts[s]})</Badge>
            ))}
            <span className="text-xs text-gray-500 ml-auto">
              {comments.length} comments
            </span>
          </div>
        </Card>
      )}

      {/* Comments grouped by file */}
      {Object.entries(grouped).map(([filePath, fileComments]) => (
        <div key={filePath}>
          <h4 className="text-xs font-mono text-gray-500 mb-2 px-1 truncate">
            {filePath}
          </h4>
          <div className="space-y-2">
            {fileComments.map(comment => (
              <Card key={comment.id} className="py-3">
                <div className="flex items-start gap-2">
                  <SeverityBadge severity={comment.severity} />
                  <div className="flex-1 min-w-0">
                    {comment.start_line && (
                      <span className="text-xs text-gray-400 mb-1 block">
                        L{comment.start_line}
                        {comment.end_line && comment.end_line !== comment.start_line
                          ? `-${comment.end_line}`
                          : ''}
                      </span>
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
