import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { TARGET_EXTENSIONS } from '../scripts/lib/corpus-targets.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const corpusDir = resolve(root, 'tests/corpus')
const nonHtmlExtensions = Object.entries(TARGET_EXTENSIONS)
  .filter(([target]) => target !== 'html')
  .map(([, extension]) => extension)

const fixtures = readdirSync(corpusDir)
  .filter(
    (name) =>
      /^\d+-/.test(name) &&
      nonHtmlExtensions.some((extension) => name.endsWith(`.${extension}`)),
  )
  .sort()

test('every non-HTML render fixture has a corpus source pair', () => {
  assert.ok(fixtures.length > 0, 'no non-HTML render fixtures were discovered')
  for (const fixture of fixtures) {
    const extension = nonHtmlExtensions.find((candidate) => fixture.endsWith(`.${candidate}`))
    const slug = basename(fixture, `.${extension}`)
    assert.ok(
      existsSync(resolve(corpusDir, `${slug}.crv`)),
      `${fixture} has no ${slug}.crv source pair`,
    )
  }
})

test('the fixture registry covers every non-HTML comparison target', () => {
  const expectedTargets = ['markdown', 'plain', 'carve', 'ansi']
  for (const target of expectedTargets) {
    assert.ok(
      Object.hasOwn(TARGET_EXTENSIONS, target),
      `${target} has no fixture extension, so engine PR CI cannot discover its golden files`,
    )
  }
  assert.equal(TARGET_EXTENSIONS.plain, 'txt', 'plain-text fixtures use the .txt suffix')
})
