import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
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

test('every sidecar was derived against the case input that sits beside it', () => {
  // A sidecar is HAND-WRITTEN, so `generate-corpus.mjs` never rewrites one. It
  // carries a sidecar across a RENUMBER, which is the failure that rule was
  // written for. The OTHER way a sidecar goes stale is invisible to it: the
  // case keeps its number and its slug, its INPUT is rewritten, and the sidecar
  // is left describing a document nobody can produce any more.
  //
  // Nothing here catches that by rendering - a non-HTML target needs an engine
  // and this suite runs none - so `45-inline-extensions-9.txt` kept the plain
  // text of the abbr/time document it used to be (`CSS Noon x`) for four
  // commits after carve#1162 replaced the case with a `kbd` one. What noticed
  // was a carve-js spec pin bump: a red suite in a different repository, on a
  // change that had nothing to do with it (carve#1165).
  //
  // The lock records the `.crv` each sidecar was derived against, so the same
  // staleness fails HERE, in the commit that moves the input.
  const lockPath = resolve(root, 'resources/corpus-sidecars.lock.json')
  assert.ok(existsSync(lockPath), 'the sidecar lock is missing; run npm run corpus:build')
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))

  const digest = (path) =>
    createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16)

  const stale = []
  const unlocked = []
  for (const fixture of fixtures) {
    const extension = nonHtmlExtensions.find((candidate) => fixture.endsWith(`.${candidate}`))
    const crv = resolve(corpusDir, `${basename(fixture, `.${extension}`)}.crv`)
    if (!existsSync(crv)) continue
    if (lock[fixture] === undefined) unlocked.push(fixture)
    else if (lock[fixture] !== digest(crv)) stale.push(fixture)
  }

  assert.deepEqual(
    unlocked,
    [],
    'sidecar(s) with no lock entry - run npm run corpus:build to record them',
  )
  assert.deepEqual(
    stale,
    [],
    'the case input moved but the sidecar did not - re-derive the sidecar from ' +
      'the current .crv, then run npm run corpus:build to relock it',
  )
})
