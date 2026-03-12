import { cn } from '@/lib/utils'

interface SealLoadingProps {
  message?: string
  className?: string
}

function SealIcon({ size = 52 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Face */}
      <ellipse cx="32" cy="34" rx="26" ry="24" fill="#8B9DAF" />
      <ellipse cx="32" cy="36" rx="22" ry="20" fill="#B0C4D8" />
      {/* Cheeks / muzzle */}
      <ellipse cx="32" cy="42" rx="14" ry="10" fill="#D4E2EE" />
      {/* Eyes */}
      <ellipse cx="22" cy="30" rx="3.5" ry="4" fill="#2C3E50" />
      <ellipse cx="42" cy="30" rx="3.5" ry="4" fill="#2C3E50" />
      <ellipse cx="23" cy="28.5" rx="1.2" ry="1.5" fill="white" />
      <ellipse cx="43" cy="28.5" rx="1.2" ry="1.5" fill="white" />
      {/* Nose */}
      <ellipse cx="32" cy="38" rx="4" ry="2.8" fill="#5A6E7F" />
      {/* Whiskers - left */}
      <line x1="10" y1="38" x2="24" y2="40" stroke="#7A8FA0" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="42" x2="23" y2="42" stroke="#7A8FA0" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="46" x2="24" y2="44" stroke="#7A8FA0" strokeWidth="1.2" strokeLinecap="round" />
      {/* Whiskers - right */}
      <line x1="54" y1="38" x2="40" y2="40" stroke="#7A8FA0" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="56" y1="42" x2="41" y2="42" stroke="#7A8FA0" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="54" y1="46" x2="40" y2="44" stroke="#7A8FA0" strokeWidth="1.2" strokeLinecap="round" />
      {/* Mouth */}
      <path d="M28 44 Q32 47 36 44" stroke="#5A6E7F" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function SealLoading({ message = 'Reviewing...', className }: SealLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center py-12', className)}>
      <div className="relative">
        <div className="inline-block animate-bounce [animation-duration:1.2s]">
          <SealIcon size={52} />
        </div>
        <span className="absolute -top-1 -right-3 text-lg animate-ping [animation-duration:2s]">
          ✨
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-4 animate-pulse">{message}</p>
    </div>
  )
}
