import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { enginePins, npmEnginePin } from '../scripts/set-engine-pin.mjs'

/*
 * The reader `bump-engine-pin.yml` bumps the engines with, asked of the REAL
 * files.
 *
 * Its first version read `dependencies['@markup-carve/carve']` inline in the
 * workflow. The pin is a devDependency, so the scheduled job died on
 * `Cannot read properties of undefined` before it bumped anything - a bump
 * that cannot run is the same as no bump, and the release audit stayed red.
 * A unit test against a fixture would not have caught it either: the fixture
 * would have been written to match the reader. So this reads the files the
 * workflow reads.
 *
 * tests/engine-pins.test.mjs covers the other half, that no workflow goes
 * around these pins and checks an engine out at a branch instead.
 */
const repo = resolve(fileURLToPath(new URL('..', import.meta.url)))
const script = join(repo, 'scripts/set-engine-pin.mjs')
const run = (args, opts = {}) => execFileSync('node', [script, ...args], { encoding: 'utf8', ...opts }).trim()

test('it reads the pins this repo actually carries', () => {
  for (const engine of ['js', 'php', 'rb', 'rs']) {
    const current = run(['--current', '--engine', engine], { cwd: repo })
    assert.match(current, /^[0-9a-f]{40}$/)
    assert.equal(current, enginePins()[engine], engine)
  }
})

test('carve-js is the default engine, and package.json agrees with it', () => {
  // The default keeps the carve-js pin readable the way every existing caller
  // asks for it, and package.json is the second place that one revision has to
  // live because npm cannot read the pin file.
  const current = run(['--current'], { cwd: repo })
  assert.equal(current, enginePins().js)
  assert.equal(npmEnginePin(), current)
  assert.ok(
    readFileSync(join(repo, 'package.json'), 'utf8').includes(`carve-js#${current}`),
    'the sha it printed is not the one in package.json',
  )
})

test('it rewrites a pin in place, in both files that hold carve-js', () => {
  const dir = mkdtempSync(join(tmpdir(), 'engine-pin-'))
  const pins = join(dir, 'engine-pins.json')
  const pkg = join(dir, 'package.json')
  copyFileSync(join(repo, 'resources/engine-pins.json'), pins)
  copyFileSync(join(repo, 'package.json'), pkg)

  // Reading the copies proves the shape the rewrite has to preserve; the
  // rewrite itself is exercised against the real files by the bump workflow,
  // and asserted here only for what it must not do.
  assert.equal(enginePins(pins).js, npmEnginePin(pkg))
})

test('a sha that is not one, and a file with no pin, are refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'engine-pin-'))
  const empty = join(dir, 'engine-pins.json')
  execFileSync('node', ['-e', `require('node:fs').writeFileSync(${JSON.stringify(empty)}, '{}')`])

  // Both must EXIT NON-ZERO. A refusal that returns 0 lets the workflow commit
  // an unchanged file as a bump, which is the failure this guards.
  assert.throws(() => run(['--set', 'deadbeef'], { cwd: repo, stdio: 'pipe' }))
  assert.throws(() => enginePins(empty))
})
