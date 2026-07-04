import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('dashboard CSS has phone-width safeguards for dense scanner surfaces', () => {
  const appCss = readFileSync(resolve(frontendRoot, 'src/App.css'), 'utf8')

  expect(appCss).toContain('@media (max-width: 640px)')
  expect(appCss).toContain('.app-shell__content')
  expect(appCss).toContain('.report-detail__header')
  expect(appCss).toContain('.extension-settings__controls')
  expect(appCss).toContain('.report-detail__modal')
  expect(appCss).toContain('overflow-wrap: anywhere')
  expect(appCss).not.toContain('font-size: clamp(')

  const nonZeroLetterSpacing = [...appCss.matchAll(/letter-spacing:\s*([^;]+);/g)].filter(
    ([, value]) => value.trim() !== '0',
  )
  expect(nonZeroLetterSpacing).toEqual([])
})
