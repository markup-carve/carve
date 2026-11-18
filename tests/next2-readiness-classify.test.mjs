import { test } from 'node:test'
import assert from 'node:assert/strict'
import { caseKey, caseFingerprint, classify, classifyUpgrade, groupDigests, listedGaps, isListed } from '../scripts/next2-readiness-classify.mjs'

const base = { area: 'clauses', kind: 'render', id: 'CC-010', clauses: ['C2-B-001'], why: 'w', input: 'a\n', expected: { html: '<p>a</p>\n' } }
const fp = c => caseFingerprint(c)
const run = ({ before = {}, after = {}, beforeFailures = {}, afterFailures = {}, listed }) => classify({
  baselineCases: before, baselineFailures: beforeFailures, currentCases: after, currentFailures: afterFailures, listed,
})

test('a case with the same input and expectation that stops passing is a regression', () => {
  const key = caseKey(base)
  const v = run({ before: { [key]: fp(base) }, after: { [key]: fp(base) }, afterFailures: { [key]: 'fail' } })
  assert.deepEqual(v.regressions, [{ key, old: 'pass', now: 'fail' }])
  assert.equal(v.gaps.unlisted.length, 0)
})

test('fail becoming unsupported is a regression too', () => {
  const key = caseKey(base)
  const v = run({ before: { [key]: fp(base) }, after: { [key]: fp(base) }, beforeFailures: { [key]: 'fail' }, afterFailures: { [key]: 'unsupported' } })
  assert.equal(v.regressions.length, 1)
})

test('a case whose expectation changed is an expected gap, not a regression', () => {
  const changed = { ...base, expected: { html: '<p>b</p>\n' } }
  const key = caseKey(base)
  const v = run({ before: { [key]: fp(base) }, after: { [key]: fp(changed) }, afterFailures: { [key]: 'fail' } })
  assert.deepEqual(v.regressions, [])
  assert.deepEqual(v.gaps.unlisted, [{ key, now: 'fail', reason: 'changed' }])
  assert.equal(v.changed, 1)
})

test('a new case that fails is an expected gap', () => {
  const key = caseKey(base)
  const v = run({ after: { [key]: fp(base) }, afterFailures: { [key]: 'unsupported' } })
  assert.deepEqual(v.regressions, [])
  assert.deepEqual(v.gaps.unlisted, [{ key, now: 'unsupported', reason: 'new' }])
  assert.equal(v.added, 1)
})

test('prose edits keep the fingerprint; input, options and expected change it', () => {
  assert.equal(fp(base), fp({ ...base, why: 'other', summary: 's', clauses: ['C2-B-002'] }))
  assert.notEqual(fp(base), fp({ ...base, input: 'b\n' }))
  assert.notEqual(fp(base), fp({ ...base, options: { headingIds: true } }))
})

test('a changed message template of an expected rule changes the fingerprint', () => {
  const lint = { ...base, kind: 'lint', expected: { diagnostics: [{ code: 'r1', line: 1 }] } }
  const a = caseFingerprint(lint, new Map([['r1', { messages: ['one'] }]]))
  const b = caseFingerprint(lint, new Map([['r1', { messages: ['two'] }]]))
  assert.notEqual(a, b)
})

test('known failures, newly passing cases and removed cases are reported only', () => {
  const a = caseKey(base), b = caseKey({ ...base, id: 'CC-011' }), gone = caseKey({ ...base, id: 'CC-012' })
  const v = run({
    before: { [a]: 'x', [b]: 'y', [gone]: 'z' }, after: { [a]: 'x', [b]: 'y' },
    beforeFailures: { [a]: 'fail', [b]: 'fail' }, afterFailures: { [a]: 'fail' },
  })
  assert.deepEqual(v.regressions, [])
  assert.deepEqual(v.known, [{ key: a, now: 'fail' }])
  assert.deepEqual(v.improved, [{ key: b, old: 'fail', now: 'pass' }])
  assert.equal(v.removed, 1)
})

test('gaps split into those STATUS.md lists and the rest', () => {
  const key = caseKey(base)
  const v = run({ after: { [key]: fp(base) }, afterFailures: { [key]: 'fail' }, listed: () => true })
  assert.equal(v.gaps.listed.length, 1)
  assert.equal(v.gaps.unlisted.length, 0)
})

test('STATUS.md engine gap sections yield case and clause ids with ranges expanded', () => {
  const ids = listedGaps([
    '## Engine gaps from the rulings', '',
    '- D1, C2-B-042 and C2-B-044: CC-1207 tests it.',
    '- The engine fails CC-145 to CC-148 and CC-1217.', '',
    '## What the reviews covered', '', '- CC-999 is not a gap.',
  ].join('\n'))
  assert.deepEqual([...ids].sort(), ['C2-B-042', 'C2-B-044', 'CC-1207', 'CC-1217', 'CC-145', 'CC-146', 'CC-147', 'CC-148'])
  assert.ok(isListed(ids, { id: 'CC-146' }))
  assert.ok(isListed(ids, { id: 'syntax-blocks-284', clauses: ['C2-B-042'] }))
  assert.ok(!isListed(ids, { id: 'CC-999' }))
  assert.ok(isListed(new Set(['CC-1']), { id: 'CC-001' }))
})

test('upgrade: a newly blocked source is a regression only while its file is unchanged', () => {
  const before = groupDigests([['pack/a.json/1', 'x'], ['pack/b.json/1', 'y']])
  const after = groupDigests([['pack/a.json/1', 'x'], ['pack/b.json/1', 'y2'], ['pack/c.json/1', 'z']])
  const v = classifyUpgrade({ baselineDigests: before, currentDigests: after, baselineIds: [], currentIds: ['pack/a.json/1', 'pack/b.json/1', 'pack/c.json/1'] })
  assert.deepEqual(v.regressions, ['pack/a.json/1'])
  assert.deepEqual(v.gaps, ['pack/b.json/1', 'pack/c.json/1'])
})
