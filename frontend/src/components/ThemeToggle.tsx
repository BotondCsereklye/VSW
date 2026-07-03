import { useEffect, useState } from 'react'

import { useTranslation } from '../i18n/useTranslation'

const STORAGE_KEY = 'vsw-theme'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === 'dark' ? t('theme.toggleToLight') : t('theme.toggleToDark')}
      title={theme === 'dark' ? t('theme.toggleToLight') : t('theme.toggleToDark')}
      onClick={() => setTheme(nextTheme)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        {theme === 'dark' ? (
          <path d="M12 4.4a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0V5.4a1 1 0 0 1 1-1Zm0 4.1a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm6.6 2.5h1.1a1 1 0 1 1 0 2h-1.1a1 1 0 1 1 0-2ZM4.3 11h1.1a1 1 0 1 1 0 2H4.3a1 1 0 1 1 0-2Zm12.9-5.6a1 1 0 0 1 1.4 1.4l-.8.8a1 1 0 1 1-1.4-1.4l.8-.8ZM6.2 16.4a1 1 0 0 1 1.4 1.4l-.8.8a1 1 0 0 1-1.4-1.4l.8-.8Zm12.4.8a1 1 0 0 1-1.4 1.4l-.8-.8a1 1 0 0 1 1.4-1.4l.8.8ZM7.6 6.2a1 1 0 0 1-1.4 1.4l-.8-.8a1 1 0 0 1 1.4-1.4l.8.8ZM12 16.5a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1Z" />
        ) : (
          <path d="M20.2 14.7a8.4 8.4 0 0 1-10.9-11 1 1 0 0 0-1.1-1.3A9.9 9.9 0 1 0 21.5 15.8a1 1 0 0 0-1.3-1.1ZM12 19.8A7.8 7.8 0 0 1 7.2 5.9 10.4 10.4 0 0 0 18 16.7a7.8 7.8 0 0 1-6 3.1Z" />
        )}
      </svg>
    </button>
  )
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY)
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
