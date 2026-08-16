/*
 * WHERE THE carve-rs BINARY IS, pinned in BOTH directions.
 *
 * Seven runners resolved this path, each carrying its own copy of the same
 * two-element list, and none of them consulted `CARGO_TARGET_DIR`. On a machine
 * that sets it - the recommended configuration here, because a full carve-rs
 * build is roughly 17G and parallel sessions otherwise fill the disk - the
 * binary exists, is fresh, and every one of those runners reported it absent.
 *
 * The consequence is worse in three of them than in the other four.
 * `fuzz-impls` and `compare:impls` refuse to run without all three engines, so
 * they say so and exit. `engine-claims`, `degradation-claims` and
 * `fmt-fixture-claims` build an engine LIST and then compare whatever is in it,
 * so an unresolved binary silently drops carve-rs from the comparison. A gate
 * that quietly measures two engines while claiming to measure three is the
 * defect class this repo keeps finding (carve#1287).
 *
 * So this asserts both halves. A binary under CARGO_TARGET_DIR is found, and a
 * binary built the ordinary way is STILL found when the variable is unset - the
 * second is the regression the fix could plausibly cause and the one no bug
 * report would have covered.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { rustBinary, rustBinaryCandidates } from '../scripts/lib/engine-locations.mjs'

/** Lay down an executable-shaped file at `dir/rel`, creating the parents. */
const plant = (dir, rel) => {
  const path = join(dir, rel)
  mkdirSync(resolve(path, '..'), { recursive: true })
  writeFileSync(path, '')

  return path
}

/** Run `fn` with CARGO_TARGET_DIR set (or removed, for `undefined`). */
const withTargetDir = (value, fn) => {
  const had = Object.hasOwn(process.env, 'CARGO_TARGET_DIR')
  const previous = process.env.CARGO_TARGET_DIR
  if (value === undefined) delete process.env.CARGO_TARGET_DIR
  else process.env.CARGO_TARGET_DIR = value
  try {
    return fn()
  } finally {
    if (had) process.env.CARGO_TARGET_DIR = previous
    else delete process.env.CARGO_TARGET_DIR
  }
}

const sandbox = () => mkdtempSync(join(tmpdir(), 'carve-rs-resolve-'))

test('a binary built into a shared CARGO_TARGET_DIR is found', () => {
  const root = sandbox()
  const checkout = join(root, 'carve-rs')
  mkdirSync(checkout, { recursive: true })
  const built = plant(root, 'shared-target/release/carve')

  const found = withTargetDir(join(root, 'shared-target'), () => rustBinary(checkout))
  assert.equal(found, built)
  rmSync(root, { recursive: true, force: true })
})

test('a binary built the ordinary way is still found when CARGO_TARGET_DIR is unset', () => {
  const root = sandbox()
  const checkout = join(root, 'carve-rs')
  const built = plant(checkout, 'target/release/carve')

  const found = withTargetDir(undefined, () => rustBinary(checkout))
  assert.equal(found, built)
  rmSync(root, { recursive: true, force: true })
})

test('a debug build is found when there is no release build', () => {
  const root = sandbox()
  const checkout = join(root, 'carve-rs')
  const built = plant(checkout, 'target/debug/carve')

  const found = withTargetDir(undefined, () => rustBinary(checkout))
  assert.equal(found, built)
  rmSync(root, { recursive: true, force: true })
})

test('CARGO_TARGET_DIR wins over a leftover target/ inside the checkout', () => {
  // When the variable is set, cargo writes THERE. Anything still sitting in the
  // checkout predates the variable, so preferring it would hand every runner a
  // binary older than the one the last build produced - the stale-artifact
  // failure this repo has been bitten by more than once.
  const root = sandbox()
  const checkout = join(root, 'carve-rs')
  plant(checkout, 'target/release/carve')
  const shared = plant(root, 'shared-target/release/carve')

  const found = withTargetDir(join(root, 'shared-target'), () => rustBinary(checkout))
  assert.equal(found, shared)
  rmSync(root, { recursive: true, force: true })
})

test('a relative CARGO_TARGET_DIR resolves against the carve-rs checkout, not this repo', () => {
  // cargo resolves a relative target dir against the directory cargo ran in,
  // which for this binary is never the spec repo.
  const root = sandbox()
  const checkout = join(root, 'carve-rs')
  const built = plant(checkout, 'shared/release/carve')

  const found = withTargetDir('shared', () => rustBinary(checkout))
  assert.equal(found, built)
  rmSync(root, { recursive: true, force: true })
})

test('an unbuilt checkout still resolves to null', () => {
  // The runners branch on null to report "carve-rs is not built". A resolver
  // that returned a path for an unbuilt checkout would turn a clear message
  // into a spawn failure.
  const root = sandbox()
  const checkout = join(root, 'carve-rs')
  mkdirSync(checkout, { recursive: true })

  assert.equal(withTargetDir(undefined, () => rustBinary(checkout)), null)
  assert.equal(withTargetDir(join(root, 'nowhere'), () => rustBinary(checkout)), null)
  rmSync(root, { recursive: true, force: true })
})

test('the candidate list keeps the checkout paths when CARGO_TARGET_DIR is set', () => {
  // Order is the claim: the shared dir first, the checkout still present as a
  // fallback for a machine that sets the variable for one build and not another.
  const candidates = withTargetDir('/shared', () => rustBinaryCandidates('/co'))
  assert.deepEqual(candidates, [
    '/shared/release/carve',
    '/shared/debug/carve',
    '/co/target/release/carve',
    '/co/target/debug/carve',
  ])
})

test('every runner that needs the binary resolves it through this helper', async () => {
  // The whole point of the shared resolver is that there is exactly one copy of
  // the list. A runner that spells `target/release/carve` again is a runner
  // that will silently drop carve-rs on this machine.
  const { readFileSync } = await import('node:fs')
  const here = resolve(import.meta.dirname, '..')
  const runners = [
    'fuzz-impls.mjs',
    'compare-impls.mjs',
    'property-check.mjs',
    'fmt-fixture-claims.mjs',
    'engine-claims.mjs',
    'degradation-claims.mjs',
    'ast-conformance.mjs',
  ]
  const offenders = runners.filter((name) => {
    const source = readFileSync(resolve(here, 'scripts', name), 'utf8')
    // The comment in property-check names the path it deliberately does not
    // spell, so only a line that is not a comment counts.
    return source
      .split('\n')
      .some((line) => line.includes('target/release/carve') && !line.trimStart().startsWith('//'))
  })
  assert.deepEqual(offenders, [], `runner(s) still hard-coding the target path: ${offenders.join(', ')}`)
})
