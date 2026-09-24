/*
 * THE FLEET PIN CHECK ACTUALLY FIRES.
 *
 * The check this one guards exists because its neighbor passed while the thing
 * its name claimed was false. scripts/check-spec-pin-ancestry.sh asserts the
 * pinned spec commit is REACHABLE from spec main, which is true of any commit
 * ever merged - including one seven behind - and the job carrying it was called
 * "spec pin is on spec main". carve-php shipped an AST ingest divergence under
 * three green copies of it.
 *
 * So a fleet check whose failing path nobody has watched fail would be the same
 * defect one layer up. Every assertion below is paired with its opposite: the
 * historical divergence must go red, the state that fixed it must go green, and
 * each exemption path must go red for its own reason rather than for any reason
 * at all.
 *
 * The engines are synthesized rather than cloned - see
 * tests/synthetic-fleet.helper.mjs - so a fleet state that never existed is as
 * cheap to build as one that did.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { fleetEnv, specCommit } from './synthetic-fleet.helper.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const script = resolve(repo, 'scripts/fleet-spec-pin-check.mjs')

/* Two real spec commits, taken from this checkout's own history so the test
 * carries no hard-coded sha that a rebase could dangle. NEWER is what an
 * agreeing fleet pins; OLDER stands in for the engine left behind. */
const NEWER = specCommit(repo)
const OLDER = specCommit(repo, 4)

/**
 * @param pins    one spec commit per engine
 * @param exempt  the body of an exemption file, or null to read the repo's own
 */
function run(pins, exempt = null, { fetch = false, breakOrigin = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'fleet-pin-'))
  // The exemption file is handed in through the environment rather than written
  // into the repository: `node --test` runs files concurrently, and a test that
  // dirties the working tree is a test that fails a neighbor.
  const exemptFile = join(root, 'fleet-pin-exempt')
  try {
    const env = { ...process.env, ...fleetEnv(root, pins) }
    if (exempt !== null) {
      writeFileSync(exemptFile, exempt)
      env.FLEET_PIN_EXEMPT_FILE = exemptFile
    }
    if (breakOrigin) {
      execFileSync('git', ['-C', env[`${breakOrigin.replace('-', '_').toUpperCase()}_DIR`],
        'remote', 'set-url', 'origin', join(root, 'no-such-origin.git')])
    }
    const args = fetch ? [script] : [script, '--ref', 'worktree', '--no-fetch']
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', env })
    return { status: result.status, out: `${result.stdout}${result.stderr}` }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const AGREED = { 'carve-js': NEWER, 'carve-rs': NEWER, 'carve-php': NEWER }
const DIVERGED = { 'carve-js': NEWER, 'carve-rs': NEWER, 'carve-php': OLDER }

test('an agreeing fleet passes', () => {
  const { status, out } = run(AGREED, '')
  assert.equal(status, 0, out)
  assert.match(out, /FLEET SPEC PIN CHECK PASSED/)
})

test('one engine behind the other two fails, and the output names it and the distance', () => {
  const { status, out } = run(DIVERGED, '')
  assert.equal(status, 1, out)
  assert.match(out, /do not implement the same spec/)
  assert.match(out, /carve-php\s+\w{8}.*4 behind carve-/)
  assert.match(out, /FLEET SPEC PIN CHECK FAILED/)
  // The one that is behind is named; the two that agree are not accused.
  assert.doesNotMatch(out, /carve-rs\s+\w{8}\s+\d{4}-\d{2}-\d{2}\s+\d+ behind carve-js/)
})

test('a declared divergence passes, and the reason is printed', () => {
  const { status, out } = run(DIVERGED, `carve-php@${OLDER.slice(0, 8)}: held for the 0.1.10 tag\n`)
  assert.equal(status, 0, out)
  assert.match(out, /EXEMPT - divergence declared deliberate/)
  assert.match(out, /carve-php at \w{8} \(\d+ behind [^)]+\): held for the 0\.1\.10 tag/)
  assert.match(out, /FLEET SPEC PIN CHECK PASSED/)
})

test('an exemption whose pin has moved fails instead of silently covering the next divergence', () => {
  // The line names OLDER; carve-php now sits somewhere else entirely.
  const { status, out } = run(
    { 'carve-js': NEWER, 'carve-rs': NEWER, 'carve-php': specCommit(repo, 2) },
    `carve-php@${OLDER.slice(0, 8)}: held for the 0.1.10 tag\n`,
  )
  assert.equal(status, 1, out)
  assert.match(out, /the pin moved, so renew the line or delete it/)
})

test('an exemption for an engine that has rejoined the fleet fails', () => {
  const { status, out } = run(AGREED, `carve-php@${NEWER.slice(0, 8)}: held for the 0.1.10 tag\n`)
  assert.equal(status, 1, out)
  assert.match(out, /the divergence this line declares is gone, delete it/)
})

test('an exemption with no reason is an error, not a skip', () => {
  const { status, out } = run(DIVERGED, `carve-php@${OLDER.slice(0, 8)}\n`)
  assert.equal(status, 1, out)
  assert.match(out, /expected `<repo>@<sha>: <reason>`/)
})

test('an engine listed twice fails, because one of the two reasons is discarded unread', () => {
  const sha = OLDER.slice(0, 8)
  const { status, out } = run(DIVERGED, `carve-php@${sha}: first\ncarve-php@${sha}: second\n`)
  assert.equal(status, 1, out)
  assert.match(out, /listed twice/)
})

test('a missing engine checkout fails, and the two that agree are not reported as ok', () => {
  const { status, out } = run({ 'carve-rs': NEWER, 'carve-php': NEWER }, '')
  assert.equal(status, 1, out)
  assert.match(out, /UNREADABLE\s+no checkout at/)
  assert.match(out, /the fleet was not fully read/)
  assert.doesNotMatch(out, /\[ok\]/)
})

test('an agreeing fleet read over a working fetch passes', () => {
  const { status, out } = run(AGREED, '', { fetch: true })
  assert.equal(status, 0, out)
  assert.match(out, /FLEET SPEC PIN CHECK PASSED/)
})

test('a fetch that fails is a finding, not a warning over a cached ref', () => {
  // Three stale remote-tracking refs that happen to match would approve a
  // release the live fleet does not support, which is the shape of the incident
  // this whole gate exists for, one level down.
  const { status, out } = run(AGREED, '', { fetch: true, breakOrigin: 'carve-php' })
  assert.equal(status, 1, out)
  assert.match(out, /could not fetch origin\/main in carve-php/)
  assert.match(out, /read from a cache/)
})

test('every exemption the repo ships is well formed', () => {
  // NOT "the file is empty". Holding an engine back is a call the release
  // process is allowed to make, and a test that goes red the moment someone
  // makes it would push people to delete the gate rather than declare the
  // divergence. What is checkable here, without knowing the fleet, is the
  // SHAPE: a known engine, a sha, and a reason a human can audit. Whether the
  // exemption still describes a real divergence is the check's own job, and it
  // judges that in both directions.
  const body = readFileSync(resolve(repo, '.fleet-pin-exempt'), 'utf8')
  const live = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  const engines = new Set(['carve-js', 'carve-rs', 'carve-php'])
  const seen = new Set()

  for (const line of live) {
    const match = line.match(/^([a-z0-9-]+)@([0-9a-f]{7,40})\s*:\s*(\S.*)$/)
    assert.ok(match, `.fleet-pin-exempt line is not <repo>@<sha>: <reason>: ${line}`)
    assert.ok(engines.has(match[1]), `.fleet-pin-exempt names an unknown repo: ${match[1]}`)
    assert.ok(!seen.has(match[1]), `.fleet-pin-exempt lists ${match[1]} twice, so one reason is discarded unread`)
    seen.add(match[1])
  }
})
