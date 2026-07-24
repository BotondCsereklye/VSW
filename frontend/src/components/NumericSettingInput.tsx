import { useState } from 'react'

type NumericSettingInputProps = {
  id?: string
  value: number
  min: number
  max: number
  ariaLabel?: string
  onCommit: (value: number) => void
}

export function NumericSettingInput({
  id,
  value,
  min,
  max,
  ariaLabel,
  onCommit,
}: NumericSettingInputProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null)
  const displayValue = draftValue ?? String(value)

  function commit(nextDraftValue = displayValue) {
    const parsed = Number.parseInt(nextDraftValue, 10)
    const normalized = Number.isNaN(parsed) ? value : Math.min(max, Math.max(min, parsed))
    setDraftValue(null)
    if (normalized !== value) {
      onCommit(normalized)
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={displayValue}
      onChange={(event) => {
        const numericDraft = event.target.value.replace(/\D/g, '').slice(0, 3)
        setDraftValue(numericDraft)
      }}
      onBlur={() => commit()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
      }}
    />
  )
}
