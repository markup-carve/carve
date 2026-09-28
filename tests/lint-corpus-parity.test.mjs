import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnostics, differences, reconcile } from '../scripts/lib/lint-corpus.mjs'

const file = 'tests/corpus/a.crv'
const run = (stdout, status = 1, stderr = '') => ({ stdout, stderr, status })
const tuple = ['broken-crossref', 2, 3]
const answers = { js: [tuple], php: [], rust: [] }
const ledger = diagnostics => ({ version: 1, differences: [{ file, reason: 'Missing reference diagnostic', issue: 'https://github.com/markup-carve/carve-js/issues/2240', diagnostics }] })

test('lint compares every occurrence and ignores message wording and order', () => {
  const a = diagnostics(run(`${file}:2:3 broken-crossref message one\ncontinued source excerpt\n${file}:2:3 broken-crossref message two\n${file}:1:1 bidi-control-in-source text\n`), [file])
  const b = diagnostics(run(`${file}:1:1 bidi-control-in-source different wording\n${file}:2:3 broken-crossref other wording\n${file}:2:3 broken-crossref other wording\n`), [file])
  assert.deepEqual(a, b)
  assert.equal(a[file].length, 3)
  const missing = { [file]: b[file].slice(1) }
  assert.deepEqual(Object.keys(differences({ js: a, php: b, rust: missing }, [file])), [file])
})

test('lint refuses crashes, malformed output, unknown paths and inconsistent exit codes', () => {
  for (const result of [run('', 2), run('panic', 1), run(`${file}:2:3 broken-crossref x`, 0), run('', 1), run('other.crv:2:3 broken-crossref x'), run(`${file}:0:3 broken-crossref x`), run(`${file}:2:3 broken-crossref x`, 1, 'Fatal error')]) {
    assert.throws(() => diagnostics(result, [file]))
  }
  assert.deepEqual(diagnostics(run('', 0), [file]), { [file]: [] })
})

test('exact declarations reject new, changed and resolved differences', () => {
  assert.deepEqual(reconcile({ [file]: answers }, ledger(answers)), [])
  assert.match(reconcile({ [file]: answers }, { version: 1, differences: [] })[0], /NEW/)
  assert.match(reconcile({}, ledger(answers))[0], /STALE/)
  for (const changed of [[['broken-crossref', 2, 4]], [tuple, tuple], [['unresolved-footnote', 2, 3]]]) {
    assert.match(reconcile({ [file]: { ...answers, js: changed } }, ledger(answers))[0], /CHANGED/)
  }
})

test('a ledger requires unique documents, a reason, an owner and all participants', () => {
  const duplicate = ledger(answers)
  duplicate.differences.push(duplicate.differences[0])
  assert.throws(() => reconcile({}, duplicate), /duplicate/)
  for (const field of ['reason', 'issue', 'diagnostics']) {
    const invalid = ledger(answers)
    delete invalid.differences[0][field]
    assert.throws(() => reconcile({}, invalid))
  }
})
