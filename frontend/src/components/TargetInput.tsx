import { useState } from 'react'
import type { FormEvent } from 'react'

import { useTranslation } from '../i18n/useTranslation'

type TargetInputProps = {
  isSubmitting: boolean
  onSubmit: (target: string) => void | Promise<void>
}

export function TargetInput({ isSubmitting, onSubmit }: TargetInputProps) {
  const [target, setTarget] = useState('')
  const { t } = useTranslation()

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
        {t('target.label')}
      </label>
      <div className="target-input__controls">
        <input
          id="scan-target"
          name="target"
          type="text"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder={t('target.placeholder')}
          autoComplete="off"
        />
        <button type="submit" disabled={isSubmitting || target.trim() === ''}>
          {isSubmitting ? t('target.submitting') : t('target.submit')}
        </button>
      </div>
      <p className="target-input__notice">
        {t('target.notice')}
      </p>
    </form>
  )
}
