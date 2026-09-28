/*
 * The binding is measured against the engine it RUNS.
 *
 * `ast:check` compared carve-rb's tree against carve-rs `main`. carve-rb links
 * a published `carve-lang` by org policy, so every tree-moving commit on `main`
 * read as a carve-rb divergence: 61 of 1924 documents at carve-rb `bf0c76c7`,
 * and 0 against the tag it pins (carve#2483). That is what the deleted
 * `binding-parity-drift.txt` declared - a ledger of rows about nothing, taken
 * at one carve-rs commit and stale at the next.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { pinnedCrateVersion, pinnedEngineBinary } from '../scripts/lib/pinned-engine.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const scratch = () => mkdtempSync(resolve(tmpdir(), 'carve-pin-test-'))

test('the pin is read off the binding manifest, alias and `=` included', () => {
  const dir = scratch()
  const manifest = resolve(dir, 'Cargo.toml')
  writeFileSync(manifest, '[dependencies]\ncarve_rs = { package = "carve-lang", version = "=0.1.6" }\n')
  assert.equal(pinnedCrateVersion(manifest), '0.1.6')

  writeFileSync(manifest, '[dependencies]\ncarve-lang = { version = "0.2.0", features = ["fs"] }\n')
  assert.equal(pinnedCrateVersion(manifest), '0.2.0')

  writeFileSync(manifest, '[dependencies]\ncarve-lang = "=0.3.0"\n')
  assert.equal(pinnedCrateVersion(manifest), '0.3.0')
})

test('another dependency above it is not read as the pin', () => {
  // carve-rb's real shape: magnus and rb-sys are declared before the engine, so
  // a pattern that took the first `version = "…"` reported the pin as magnus's
  // 0.8 - a version of carve-lang that does not exist, decided before the
  // comparison ran.
  const manifest = resolve(scratch(), 'Cargo.toml')
  writeFileSync(
    manifest,
    '[dependencies]\nmagnus = { version = "0.8", features = ["rb-sys"] }\nrb-sys = "0.9"\n' +
      'carve_rs = { package = "carve-lang", version = "=0.1.6" }\n',
  )
  assert.equal(pinnedCrateVersion(manifest), '0.1.6')
})

test('an unreadable manifest is null rather than a guessed version', () => {
  assert.equal(pinnedCrateVersion(resolve(scratch(), 'absent.toml')), null)
})

test('a cache directory holding another version is not served as this pin', () => {
  const root = scratch()
  mkdirSync(resolve(root, 'bin'), { recursive: true })
  writeFileSync(resolve(root, 'bin', 'carve'), '')
  writeFileSync(resolve(root, '.crates.toml'), '[v1]\n"carve-lang 0.1.5 (registry+x)" = ["carve"]\n')

  // `install: false` so the miss is reported instead of reached for over the
  // network; the point is that the hit was refused, not what follows it.
  const miss = pinnedEngineBinary('0.1.6', { cacheRoot: root, install: false })
  assert.equal(miss.path, null)
  assert.match(miss.why, /no cached carve-lang 0\.1\.6/)

  writeFileSync(resolve(root, '.crates.toml'), '[v1]\n"carve-lang 0.1.6 (registry+x)" = ["carve"]\n')
  assert.equal(pinnedEngineBinary('0.1.6', { cacheRoot: root, install: false }).path, resolve(root, 'bin', 'carve'))
})

test('an unreadable pin never silently compares against something else', () => {
  const answer = pinnedEngineBinary(null, { cacheRoot: scratch(), install: false })
  assert.equal(answer.path, null)
  assert.match(answer.why, /could not read the pinned carve-lang version/)
})

test('the gate measures against the pin, and says so where it fails', () => {
  const source = readFileSync(resolve(here, '../scripts/ast-conformance.mjs'), 'utf8')
  assert.match(source, /pinnedEngineBinary\(rbPin\)/, 'the comparison no longer builds the pinned engine')
  assert.doesNotMatch(
    source,
    /binding-parity-drift/,
    'the pin-window ledger is back; the comparison against the pin is what made it unnecessary',
  )
  assert.match(
    source,
    /BINDING PARITY: not measured/,
    'an unobtainable pin now passes quietly, which is a gate that reports success having measured nothing',
  )
})

test('an overridden binary is not reported as the pin', () => {
  // The override exists for a CI job that provisions the build itself, so it
  // can name ANY build. Measured while verifying this change: pointed at
  // carve-rs `main` the comparison found 68 of 1971 documents and called them
  // differences from "carve-lang 0.1.6, the version it pins", which is a
  // version that build is not.
  const root = scratch()
  mkdirSync(resolve(root, 'bin'), { recursive: true })
  const elsewhere = resolve(root, 'bin', 'carve')
  writeFileSync(elsewhere, '')
  process.env.CARVE_RS_PINNED_BIN = elsewhere
  try {
    assert.equal(pinnedEngineBinary('0.1.6', { install: false }).source, 'override')
  } finally {
    delete process.env.CARVE_RS_PINNED_BIN
  }

  const source = readFileSync(resolve(here, '../scripts/ast-conformance.mjs'), 'utf8')
  assert.match(source, /pinned\.source === 'override'/, 'the verdict names the pin whatever binary it read')
})
