/*
 * `resources/engine-pin-drift/` holds one file per slug, named by the slug, the
 * reason its one line. Parallel spec PRs that declare different slugs add
 * different files, so they cannot conflict the way appends to one shared
 * `engine-pin-drift.txt` did.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDriftLedger } from '../scripts/lib/drift-ledger.mjs'

const resources = fileURLToPath(new URL('../resources/', import.meta.url))
const ledger = join(resources, 'engine-pin-drift')

test('the ledger is a directory, and no combined file is left beside it', () => {
  assert.ok(!existsSync(join(resources, 'engine-pin-drift.txt')), 'resources/engine-pin-drift.txt is back; declare each slug as its own file')
  assert.ok(existsSync(join(ledger, '.README')), 'the ledger directory lost its .README')
})

test('every row file holds one line of reason', () => {
  const faults = readdirSync(ledger)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => {
      const text = readFileSync(join(ledger, name), 'utf8')
      return !/^[^\n]*\S[^\n]*\n?$/.test(text)
    })
  assert.deepEqual(faults, [])
  assert.doesNotThrow(() => parseDriftLedger(ledger))
})

test('a directory ledger reads like the line ledger it replaced', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'carve-drift-dir-')), 'engine-pin-drift')
  mkdirSync(dir)
  writeFileSync(join(dir, '.README'), 'not a row\n')
  writeFileSync(join(dir, 'b-case'), 'pinned build predates carve#2\n')
  writeFileSync(join(dir, 'a-case'), 'pinned build predates carve#1\n')
  assert.deepEqual([...parseDriftLedger(dir)], [
    ['a-case', 'pinned build predates carve#1'],
    ['b-case', 'pinned build predates carve#2'],
  ])

  writeFileSync(join(dir, 'c-case'), '\n')
  assert.throws(() => parseDriftLedger(dir), /no reason in c-case/)
  writeFileSync(join(dir, 'c-case'), 'one\ntwo\n')
  assert.throws(() => parseDriftLedger(dir), /more than one line/)
  writeFileSync(join(dir, 'C-case'), 'reason\n')
  writeFileSync(join(dir, 'c-case'), 'reason\n')
  assert.throws(() => parseDriftLedger(dir), /not a file-safe key: C-case/)
})

test('the declaration audit reads the reason out of each row file', async () => {
  process.env.CARVE_DECL_AUDIT_LIB = '1'
  const { __internals } = await import('../scripts/declaration-audit.mjs')
  const entry = __internals.MANIFEST.find((row) => row.path === 'resources/engine-pin-drift')
  assert.equal(entry?.kind, 'dir-ledger')
  const rows = __internals.liveRows(entry, 'a-case  pinned build predates carve#1\nb-case')
  assert.deepEqual(__internals.undeclaredLedgerRows(rows).length, 1)
})
