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

import { execFileSync } from 'node:child_process'

import { pinnedEnginePin, pinnedEngineBinary } from '../scripts/lib/pinned-engine.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const scratch = () => mkdtempSync(resolve(tmpdir(), 'carve-pin-test-'))

test('the pin is read off the binding manifest, alias and `=` included', () => {
  const dir = scratch()
  const manifest = resolve(dir, 'Cargo.toml')
  writeFileSync(manifest, '[dependencies]\ncarve_rs = { package = "carve-lang", version = "=0.1.6" }\n')
  assert.deepEqual(pinnedEnginePin(manifest), { kind: 'version', value: '0.1.6', git: null })

  writeFileSync(manifest, '[dependencies]\ncarve-lang = { version = "0.2.0", features = ["fs"] }\n')
  assert.deepEqual(pinnedEnginePin(manifest), { kind: 'version', value: '0.2.0', git: null })

  writeFileSync(manifest, '[dependencies]\ncarve-lang = "=0.3.0"\n')
  assert.deepEqual(pinnedEnginePin(manifest), { kind: 'version', value: '0.3.0', git: null })
})

test('a git/rev pin is a pin, not an unreadable manifest', () => {
  // carve-rb#185 moved off the published crate to a revision of carve-rs. The
  // reader knew one spelling, returned null on this one, and the workflow step
  // that asks it turned that null into a hard exit: four AST shards and the
  // full-corpus verdict died on `could not read the carve-lang pin`, on a day
  // no commit here touched any of it (carve#2881).
  const manifest = resolve(scratch(), 'Cargo.toml')
  const rev = '889e916f62dd9d51d743b544a83d04dace2d924c'
  writeFileSync(
    manifest,
    '[dependencies]\nmagnus = { version = "0.8", features = ["rb-sys"] }\n' +
      `carve_rs = { package = "carve-lang", git = "https://github.com/markup-carve/carve-rs", rev = "${rev}" }\n`,
  )
  assert.deepEqual(pinnedEnginePin(manifest), {
    kind: 'rev', value: rev, git: 'https://github.com/markup-carve/carve-rs',
  })
})

test('the workflow asks the shared reader, and gets both spellings back', () => {
  // The step is shell in a scheduled workflow, so nothing but this runs it.
  // Asserted by RUNNING the script the step runs, because the defect was that
  // the workflow carried a second spelling of this rule which fell behind.
  const workflow = readFileSync(resolve(here, '..', '.github/workflows/ast-conformance.yml'), 'utf8')
  assert.match(
    workflow,
    /node scripts\/engine-pin-fields\.mjs carve-rb\/ext\/carve\/Cargo\.toml/,
    'the workflow reads the pin with a spelling of its own again',
  )

  const script = resolve(here, '../scripts/engine-pin-fields.mjs')
  const fields = (body) => {
    const manifest = resolve(scratch(), 'Cargo.toml')
    writeFileSync(manifest, body)
    return Object.fromEntries(
      execFileSync('node', [script, manifest], { encoding: 'utf8' })
        .trim().split('\n').map((line) => line.split('=').slice(0, 1).concat(line.split('=').slice(1).join('='))),
    )
  }

  const version = fields('[dependencies]\ncarve_rs = { package = "carve-lang", version = "=0.1.8" }\n')
  assert.equal(version.kind, 'version')
  assert.equal(version.value, '0.1.8')

  const rev = '889e916f62dd9d51d743b544a83d04dace2d924c'
  const git = fields(
    `[dependencies]\ncarve_rs = { package = "carve-lang", git = "https://github.com/markup-carve/carve-rs", rev = "${rev}" }\n`,
  )
  assert.equal(git.kind, 'rev')
  assert.equal(git.value, rev)
  assert.equal(git.git, 'https://github.com/markup-carve/carve-rs')
  // The cache key has to move with the pin, or a rev bump is served the
  // previous rev's build out of the Actions cache and compared against it.
  assert.notEqual(git.cache, version.cache)
})

test('an unreadable pin still fails the workflow step loudly', () => {
  const manifest = resolve(scratch(), 'Cargo.toml')
  writeFileSync(manifest, '[dependencies]\nmagnus = { version = "0.8" }\n')
  assert.throws(
    () => execFileSync('node', [resolve(here, '../scripts/engine-pin-fields.mjs'), manifest], { stdio: 'pipe' }),
    'a manifest with no carve-lang line now passes, so the comparison would pick its own engine',
  )
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
  assert.deepEqual(pinnedEnginePin(manifest), { kind: 'version', value: '0.1.6', git: null })
})

test('an unreadable manifest is null rather than a guessed version', () => {
  assert.equal(pinnedEnginePin(resolve(scratch(), 'absent.toml')), null)
})

test('a cache directory holding another version is not served as this pin', () => {
  const root = scratch()
  mkdirSync(resolve(root, 'bin'), { recursive: true })
  writeFileSync(resolve(root, 'bin', 'carve'), '')
  writeFileSync(resolve(root, '.crates.toml'), '[v1]\n"carve-lang 0.1.5 (registry+x)" = ["carve"]\n')

  // `install: false` so the miss is reported instead of reached for over the
  // network; the point is that the hit was refused, not what follows it.
  const pin = { kind: 'version', value: '0.1.6', git: null }
  const miss = pinnedEngineBinary(pin, { cacheRoot: root, install: false })
  assert.equal(miss.path, null)
  assert.match(miss.why, /no cached carve-lang 0\.1\.6/)

  writeFileSync(resolve(root, '.crates.toml'), '[v1]\n"carve-lang 0.1.6 (registry+x)" = ["carve"]\n')
  assert.equal(pinnedEngineBinary(pin, { cacheRoot: root, install: false }).path, resolve(root, 'bin', 'carve'))
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
    assert.equal(pinnedEngineBinary({ kind: 'version', value: '0.1.6', git: null }, { install: false }).source, 'override')
  } finally {
    delete process.env.CARVE_RS_PINNED_BIN
  }

  const source = readFileSync(resolve(here, '../scripts/ast-conformance.mjs'), 'utf8')
  assert.match(source, /pinned\.source === 'override'/, 'the verdict names the pin whatever binary it read')
})
