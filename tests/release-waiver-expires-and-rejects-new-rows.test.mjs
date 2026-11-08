import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.CARVE_DECL_AUDIT_LIB = '1'
const { __internals: { releaseWaiver, matchWaiverRows } } = await import('../scripts/declaration-audit.mjs')

const directory = mkdtempSync(join(tmpdir(), 'carve-release-waiver-'))
const file = join(directory, 'waiver.json')
writeFileSync(file, JSON.stringify({
  version: '0.1.14',
  lists: [{ repo: 'spec', path: 'resources/example.txt', name: null, ticket: 5468, rows: ['owed A'] }],
}))

test('the release waiver applies only to its package version', () => {
  assert.equal(releaseWaiver('0.1.14', file).size, 1)
  assert.equal(releaseWaiver('0.1.15', file).size, 0)
})

test('an unlisted or duplicate row remains owed', () => {
  const list = releaseWaiver('0.1.14', file).values().next().value
  assert.deepEqual(matchWaiverRows(['owed A', 'owed B', 'owed A'], list), {
    applied: ['owed A'],
    remaining: ['owed B', 'owed A'],
    removable: [],
  })
})

test('a fixed row is reported as removable without failing', () => {
  const list = releaseWaiver('0.1.14', file).values().next().value
  assert.deepEqual(matchWaiverRows([], list), {
    applied: [],
    remaining: [],
    removable: ['owed A'],
  })
})
