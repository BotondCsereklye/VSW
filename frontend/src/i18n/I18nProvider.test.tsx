import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'

import { LanguageSelector } from '../components/LanguageSelector'
import { I18nProvider } from './I18nProvider'
import { useTranslation } from './useTranslation'

function Probe() {
  const { t } = useTranslation()
  return (
    <>
      <LanguageSelector />
      <p>{t('target.submit')}</p>
    </>
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

test('language selector stores the selected language', async () => {
  const user = userEvent.setup()

  render(
    <I18nProvider>
      <Probe />
    </I18nProvider>,
  )

  const englishButton = screen.getByRole('button', { name: 'English' })
  const germanButton = screen.getByRole('button', { name: 'Deutsch' })

  expect(englishButton).not.toHaveTextContent('EN')
  expect(germanButton).not.toHaveTextContent('DE')
  expect(englishButton.querySelector('.language-flag--en')).not.toBeNull()
  expect(germanButton.querySelector('.language-flag--de')).not.toBeNull()

  await user.click(germanButton)

  expect(window.localStorage.getItem('vsw-language')).toBe('de')
  expect(screen.getByText('Sicheren Scan starten')).toBeInTheDocument()
})

test('provider falls back to English for invalid stored language', () => {
  window.localStorage.setItem('vsw-language', 'unknown')

  render(
    <I18nProvider>
      <Probe />
    </I18nProvider>,
  )

  expect(screen.getByText('Start safe scan')).toBeInTheDocument()
})
