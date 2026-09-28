/*
 * The carve-rb pin window, in both directions.
 *
 * `ast:check` gated every difference between carve-rb's tree and carve-rs's
 * with one verdict, and two different facts arrived through it: a gap in the
 * BINDING, which nothing excuses, and the window between a carve-rs merge and
 * its crates.io release, which nothing in any repo can close while the pin
 * names a published version. The second kept AST conformance red with no fix
 * available (carve#2175), so it is declared - and a declaration is only worth
 * having while every way it can stop being true is red.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bindingParityProblems } from '../scripts/lib/binding-parity.mjs'
import { parseDriftLedger } from '../scripts/lib/drift-ledger.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LEDGER = resolve(root, 'resources/binding-parity-drift.txt')

const window_ = { pinned: '0.1.6', built: '0.1.7' }
const row = (name) => [name, 'carve-rb links published carve-lang =0.1.6 and carve-rs main has moved past it (markup-carve/carve-rb#143).']

test('a declared document in the window is not a failure', () => {
  const { problems, notes } = bindingParityProblems(
    ['a.crv'],
    new Map([row('a.crv')]),
    ['a.crv'],
    window_,
  )
  assert.deepEqual(problems, [])
  assert.deepEqual(notes, [])
})

test('NEW: a document that differs and is not declared', () => {
  const { problems } = bindingParityProblems(['a.crv', 'b.crv'], new Map([row('a.crv')]), ['a.crv', 'b.crv'], window_)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^NEW\s+b\.crv differs and is not declared/)
})

test('AGREED: a declared document that reproduces again', () => {
  const { problems } = bindingParityProblems([], new Map([row('a.crv')]), ['a.crv'], window_)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^AGREED\s+a\.crv reproduces again/)
})

test('a declared document the run never compared is a note, not a deletion', () => {
  // `--satellite-limit` slices the run. A sliced run sees a declared document
  // not drifting because it never reached it, and "delete the row" would be
  // advice the measurement cannot support.
  const { problems, notes } = bindingParityProblems([], new Map([row('a.crv')]), [], window_)
  assert.deepEqual(problems, [])
  assert.equal(notes.length, 1)
  assert.match(notes[0], /^NOT REACHED\s+a\.crv/)
})

test('THE EXPIRY: the window closing refuses the whole ledger', () => {
  const { problems } = bindingParityProblems(
    ['a.crv'],
    new Map([row('a.crv')]),
    ['a.crv'],
    { pinned: '0.1.7', built: '0.1.7' },
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /both say 0\.1\.7.*delete the file/s)
})

test('THE EXPIRY, per row: a pin that moved but still lags', () => {
  // carve-rb bumps to 0.1.7 while carve-rs main is already 0.1.8. The window is
  // still open, so the file-level refusal above does not fire - and every row
  // still names 0.1.6, which is a measurement against a pin nobody has now.
  const { problems } = bindingParityProblems(
    ['a.crv'],
    new Map([row('a.crv')]),
    ['a.crv'],
    { pinned: '0.1.7', built: '0.1.8' },
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^STALE PIN\s+a\.crv is declared against another pin/)
})

test('a version this run could not read cannot silence the ledger', () => {
  for (const versions of [{ pinned: null, built: '0.1.7' }, { pinned: '0.1.6', built: null }]) {
    const { problems } = bindingParityProblems(['a.crv'], new Map([row('a.crv')]), ['a.crv'], versions)
    assert.equal(problems.length, 1)
    assert.match(problems[0], /could not read both versions/)
  }
})

test('an empty ledger against no drift is silent', () => {
  const { problems, notes } = bindingParityProblems([], new Map(), ['a.crv'], { pinned: null, built: null })
  assert.deepEqual(problems, [])
  assert.deepEqual(notes, [])
})

test('every shipped row names the pin it was measured against', () => {
  // The row-level expiry is the whole mechanism: a header note about which pin
  // a file describes is read by nothing, and a declaration nothing re-measures
  // becomes permanent.
  const rows = parseDriftLedger(LEDGER)
  assert.ok(rows.size > 0, 'an empty ledger means the window closed - delete the file instead')
  for (const [name, reason] of rows) {
    assert.match(reason, /=\d+\.\d+\.\d+/, `${name} names no pin version`)
    assert.match(reason, /[\w.-]+\/[\w.-]+#\d+/, `${name} names no fully qualified issue`)
  }
})

test('the shipped ledger lists corpus documents that exist', () => {
  // A renamed or deleted fixture leaves a row describing nothing, and the
  // AGREED direction cannot tell that apart from a document that reproduces.
  const corpus = new Set(readdirSync(resolve(root, 'tests/corpus')).filter((f) => f.endsWith('.crv')))
  for (const name of parseDriftLedger(LEDGER).keys()) {
    assert.ok(corpus.has(name), `${name} is declared and the corpus has no such document`)
  }
})
