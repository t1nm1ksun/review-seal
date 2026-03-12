import { Toggle } from '@/components/ui/toggle'
import type { AiProvider } from '@/types/review'

interface AiProviderToggleProps {
  value: AiProvider
  onChange: (value: AiProvider) => void
  className?: string
}

const providerOptions: { value: AiProvider; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
]

export function AiProviderToggle({ value, onChange, className }: AiProviderToggleProps) {
  return (
    <Toggle
      options={providerOptions}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}
