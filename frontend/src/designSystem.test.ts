import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readFrontendFile(path: string) {
  return readFileSync(resolve(frontendRoot, path), 'utf8')
}

function expectOnlyGrayscaleColors(source: string) {
  const hexColors = source.match(/#[0-9a-f]{3,8}\b/gi) ?? []

  for (const color of hexColors) {
    const hex = color.slice(1)
    const expanded =
      hex.length === 3 || hex.length === 4
        ? hex
            .slice(0, 3)
            .split('')
            .map((channel) => channel.repeat(2))
        : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)]

    expect(new Set(expanded).size, `${color} must be grayscale`).toBe(1)
  }

  const rgbColors = source.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)
  for (const [, red, green, blue] of rgbColors) {
    expect(red, `rgb(${red}, ${green}, ${blue}) must be grayscale`).toBe(green)
    expect(green, `rgb(${red}, ${green}, ${blue}) must be grayscale`).toBe(blue)
  }
}

test('frontend styling stays restrained, consistent and free of decorative motion', () => {
  const appCss = readFrontendFile('src/App.css')
  const indexCss = readFrontendFile('src/index.css')
  const css = `${indexCss}\n${appCss}`
  const cssWithoutFlags = css.replace(/\.language-flag--[a-z]+\s*{[^}]*}/g, '')

  expect(cssWithoutFlags).not.toMatch(/(?:linear|radial)-gradient/i)
  expect(css).not.toContain('color-mix(')
  expect(css).not.toMatch(/\btransition\s*:/)
  expect(css).not.toMatch(/\banimation\s*:/)
  expect(css).not.toMatch(/\bbox-shadow\s*:/)

  const radii = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map(([, value]) => value.trim())
  expect(radii.length).toBeGreaterThan(0)
  expect(new Set(radii)).toEqual(
    new Set(['0', '3px', '12px', '999px', 'var(--ui-radius)', 'var(--ui-radius-sm)']),
  )
  expectOnlyGrayscaleColors(cssWithoutFlags)

  expect(appCss).toMatch(/\.app-shell h1\s*{[^}]*font-family:\s*Georgia/s)
  expect(appCss).not.toContain('line-height: 0.94')
})

test('brand artwork is flat, square and monochrome', () => {
  for (const path of ['public/vsw-logo.svg', 'public/favicon.svg']) {
    const svg = readFrontendFile(path)

    expect(svg).not.toContain('linearGradient')
    expect(svg).not.toContain('<filter')
    expect(svg).not.toMatch(/\brx="[1-9]/)
    expectOnlyGrayscaleColors(svg)
  }
})
