import { useState } from 'react'
import type { FormEvent } from 'react'

type TargetInputProps = {
  isSubmitting: boolean
  onSubmit: (target: string) => void | Promise<void>
}

export function TargetInput({ isSubmitting, onSubmit }: TargetInputProps) {
  const [target, setTarget] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = target.trim()
    if (!normalized) {
      return
    }
    void onSubmit(normalized)
  }

  return (
    <form className="target-input" onSubmit={handleSubmit}>
      <label className="target-input__label" htmlFor="scan-target">
        Target
      </label>
      <div className="target-input__controls">
        <input
          id="scan-target"
          name="target"
          type="text"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="example.com or 203.0.113.10"
          autoComplete="off"
        />
        <button type="submit" disabled={isSubmitting || target.trim() === ''}>
          {isSubmitting ? 'Creating scan…' : 'Start safe scan'}
        </button>
      </div>
      <p className="target-input__notice">
        Only scan systems you own or are authorized to assess.
      </p>
    </form>
  )
}
