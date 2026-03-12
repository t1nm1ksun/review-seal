import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PRFile } from '@/lib/github'

interface DiffViewerProps {
  files: PRFile[]
}

export function DiffViewer({ files }: DiffViewerProps) {
  return (
    <div className="space-y-2">
      {files.map(file => (
        <DiffFile key={file.filename} file={file} />
      ))}
    </div>
  )
}

function DiffFile({ file }: { file: PRFile }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 active:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="text-xs font-mono text-gray-700 truncate flex-1">
          {file.filename}
        </span>
        <span className="text-xs text-emerald-600 flex-shrink-0">+{file.additions}</span>
        <span className="text-xs text-red-600 flex-shrink-0">-{file.deletions}</span>
      </button>

      {expanded && file.patch && (
        <div className="overflow-x-auto border-t border-border">
          <pre className="text-xs leading-5 font-mono p-0 m-0">
            {file.patch.split('\n').map((line, i) => (
              <div
                key={i}
                className={cn(
                  'px-3 min-w-fit',
                  line.startsWith('+') && !line.startsWith('+++')
                    ? 'bg-emerald-50 text-emerald-800'
                    : line.startsWith('-') && !line.startsWith('---')
                      ? 'bg-red-50 text-red-800'
                      : line.startsWith('@@')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600',
                )}
              >
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}
