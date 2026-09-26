import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanRefusal, lintDriftProblems, lintRules } from '../scripts/lib/parity-verdict.mjs'

test('lint parity rejects new gaps and stale declarations', () => {
  const declared = new Map([['rust/old', 'not implemented']])
  assert.deepEqual(lintDriftProblems(new Set(['rust/old']), declared), [])
  assert.deepEqual(lintDriftProblems(new Set(['php/new']), declared), [
    'NEW missing lint rule: php/new', 'STALE lint declaration: rust/old',
  ])
})

test('unspellable output must fail cleanly', () => {
  const clean = { status: 1, stdout: '', stderr: 'Error: cannot spell table_row' }
  assert.equal(cleanRefusal(clean), true)
  for (const change of [{ status: 0 }, { status: null }, { stdout: 'partial' }, { stderr: 'Stack trace: cannot spell table_row' }]) {
    assert.equal(cleanRefusal({ ...clean, ...change }), false)
  }
})

test('failed lint commands cannot count as declared missing rules', () => {
  const empty = { status: 0, stdout: '', stderr: '' }
  const finding = { status: 1, stdout: 'stdin:1:2 broken-crossref Missing target', stderr: '' }
  assert.deepEqual([...lintRules(empty)], [])
  assert.deepEqual([...lintRules(finding)], ['broken-crossref'])
  for (const result of [
    { ...empty, status: 1, stderr: 'Fatal error' },
    { ...finding, status: 0 },
    { ...finding, status: 2 },
    { ...empty, status: null },
  ]) assert.throws(() => lintRules(result), /status and diagnostics disagree/)
})
