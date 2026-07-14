import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readFrontendFile(path: string) {
  return readFileSync(resolve(frontendRoot, path), 'utf8')
}

describe('PWA metadata', () => {
  test('index document exposes install metadata for mobile browsers', () => {
    const indexHtml = readFrontendFile('index.html')

    expect(indexHtml).toContain('name="viewport"')
    expect(indexHtml).toContain('viewport-fit=cover')
    expect(indexHtml).toContain('rel="manifest"')
    expect(indexHtml).toContain('name="theme-color"')
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable"')
  })

  test('web manifest keeps the mobile app installable without promising offline mode', () => {
    const manifest = JSON.parse(readFrontendFile('public/manifest.webmanifest')) as {
      name?: string
      short_name?: string
      start_url?: string
      display?: string
      icons?: Array<{ src: string; sizes: string; purpose?: string }>
    }

    expect(manifest.name).toBe('VSW Defensive Scanner')
    expect(manifest.short_name).toBe('VSW')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/vsw-logo.svg',
          sizes: 'any',
          purpose: expect.stringContaining('maskable'),
        }),
      ]),
    )
    expect(JSON.stringify(manifest).toLowerCase()).not.toContain('offline')
  })
})
