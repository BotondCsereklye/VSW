import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'

import { I18nProvider } from '../i18n/I18nProvider'
import { ThemeToggle } from './ThemeToggle'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

test('ThemeToggle stores the selected theme', async () => {
  const user = userEvent.setup()

  render(
    <I18nProvider>
      <ThemeToggle />
    </I18nProvider>,
  )

  await user.click(screen.getByRole('button', { name: /dark mode/i }))

  expect(window.localStorage.getItem('vsw-theme')).toBe('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
})
