import { cn } from '@/lib/utils'

interface SealLoadingProps {
  message?: string
  className?: string
}

export function SealLoading({ message = 'Reviewing...', className }: SealLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center py-12', className)}>
      <div className="relative">
        <span className="text-5xl inline-block animate-bounce [animation-duration:1.2s]">
          🦭
        </span>
        <span className="absolute -top-1 -right-3 text-lg animate-ping [animation-duration:2s]">
          ✨
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-4 animate-pulse">{message}</p>
    </div>
  )
}
