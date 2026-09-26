import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

/*
 * The reader `bump-engine-pin.yml` bumps the engine with, asked of the REAL
 * package.json.
 *
 * Its first version read `dependencies['@markup-carve/carve']` inline in the
 * workflow. The pin is a devDependency, so the scheduled job died on
 * `Cannot read properties of undefined` before it bumped anything - a bump
 * that cannot run is the same as no bump, and the release audit stayed red.
 * A unit test against a fixture would not have caught it either: the fixture
 * would have been written to match the reader. So this reads the file the
 * workflow reads.
 */
const repo = resolve(fileURLToPath(new URL('..', import.meta.url)))
const script = join(repo, 'scripts/set-engine-pin.mjs')
const run = (args, opts = {}) => execFileSync('node', [script, ...args], { encoding: 'utf8', ...opts }).trim()

test('it reads the pin this repo actually carries', () => {
  const current = run(['--current'], { cwd: repo })
  assert.match(current, /^[0-9a-f]{40}$/)
  assert.ok(
    readFileSync(join(repo, 'package.json'), 'utf8').includes(`carve-js#${current}`),
    'the sha it printed is not the one in package.json',
  )
})

test('it rewrites that pin in place', () => {
  const copy = join(mkdtempSync(join(tmpdir(), 'engine-pin-')), 'package.json')
  copyFileSync(join(repo, 'package.json'), copy)
  const target = 'a'.repeat(40)
  run([target, copy])
  assert.equal(run(['--current', copy]), target)
})

test('a sha that is not one, and a file with no pin, are refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'engine-pin-'))
  const empty = join(dir, 'package.json')
  execFileSync('node', ['-e', `require('node:fs').writeFileSync(${JSON.stringify(empty)}, '{}')`])

  // Both must EXIT NON-ZERO. A refusal that returns 0 lets the workflow commit
  // an unchanged file as a bump, which is the failure this guards.
  assert.throws(() => run(['deadbeef'], { cwd: repo, stdio: 'pipe' }))
  assert.throws(() => run(['b'.repeat(40), empty], { stdio: 'pipe' }))
})
