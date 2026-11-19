import { test } from 'node:test'
import assert from 'node:assert/strict'
import { caseKey, caseFingerprint, classify, classifyUpgrade, groupDigests, listedGaps, isListed, upgradeClass, upgradeClassCounts, upgradeBarFail } from '../scripts/next2-readiness-classify.mjs'

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

test('STATUS.md engine gap sections recognize named tree fixture ids', () => {
  const ids = listedGaps([
    '## Engine gaps from the rulings',
    '- The changed `syntax-blocks-284` and `syntax-inline-128` tree fixtures still differ.',
    '- The `html-7` fixture also differs.',
    '## What the reviews covered',
    '- The `syntax-inline-18` fixture is not a gap.',
  ].join('\n'))
  for (const id of ['syntax-blocks-284', 'syntax-inline-128', 'html-7']) assert.ok(isListed(ids, { id }))
  assert.ok(!isListed(ids, { id: 'syntax-inline-18' }))
})

test('upgrade: a newly blocked source is a regression only while its file is unchanged', () => {
  const before = groupDigests([['pack/a.json/1', 'x'], ['pack/b.json/1', 'y']])
  const after = groupDigests([['pack/a.json/1', 'x'], ['pack/b.json/1', 'y2'], ['pack/c.json/1', 'z']])
  const v = classifyUpgrade({ baselineDigests: before, currentDigests: after, baselineIds: [], currentIds: ['pack/a.json/1', 'pack/b.json/1', 'pack/c.json/1'] })
  assert.deepEqual(v.regressions, ['pack/a.json/1'])
  assert.deepEqual(v.gaps, ['pack/b.json/1', 'pack/c.json/1'])
})

const kinds = new Map([['U-068', 'rewrite'], ['U-106', 'escape'], ['U-145', 'report'], ['X-001', 'none']])
const malformed = new Set(['unclosed-code-fence'])
const mismatch = (line, extra = {}) => ({ entry: 'upgrade-mismatch', class: 'mismatch', line, message: 'differs', ...extra })
const cls = (records, lint = [], error) => upgradeClass({ records, lint, error, kinds, malformed })

test('a thrown upgrade is a tool defect', () => {
  assert.equal(cls([], [], 'boom'), 'b')
})

test('a rewrite or escape row on the mismatch line is a tool defect', () => {
  assert.equal(cls([{ entry: 'U-068', line: 2 }, { entry: 'U-145', line: 2 }, mismatch(2)]), 'b')
  assert.equal(cls([{ entry: 'U-106', line: 3 }, mismatch(3)]), 'b')
})

test('only report and none rows on the mismatch line make a report-row source', () => {
  assert.equal(cls([{ entry: 'U-068', line: 1 }, { entry: 'U-145', line: 2 }, mismatch(2)]), 'a')
  assert.equal(cls([{ entry: 'X-001', line: 4 }, mismatch(4)]), 'a')
})

test('with no row on the mismatch line, the source rows decide', () => {
  assert.equal(cls([{ entry: 'U-068', line: 1 }, mismatch(5)]), 'b')
  assert.equal(cls([{ entry: 'U-145', line: 1 }, mismatch(5)]), 'a')
})

test('a malformed 0.1 finding on the mismatch line makes a malformed source', () => {
  assert.equal(cls([{ entry: 'U-068', line: 2 }, mismatch(2)], [{ rule: 'unclosed-code-fence', line: 2 }]), 'c')
  assert.equal(cls([{ entry: 'U-068', line: 2 }, mismatch(2)], [{ rule: 'unclosed-code-fence', line: 1 }]), 'b')
  assert.equal(cls([{ entry: 'U-068', line: 2 }, mismatch(2)], [{ rule: 'unused-footnote-definition', line: 2 }]), 'b')
})

test('a difference with no mapped row is malformed when the source has any malformed finding, else unmapped', () => {
  const none = [mismatch(6, { status: 'no mapped row' })]
  assert.equal(cls(none), 'd')
  assert.equal(cls(none, [{ rule: 'unclosed-code-fence', line: 2 }]), 'c')
  assert.equal(cls(none, [{ rule: 'broken-crossref', line: 6 }]), 'd')
  assert.equal(cls([{ entry: 'U-145', line: 6 }, ...none]), 'd')
})

test('a blocked source of an unchanged file that moves to a readiness class is a regression', () => {
  const digests = { 'pack/a.json': 'x', 'pack/b.json': 'y' }
  const v = classifyUpgrade({ baselineDigests: digests, currentDigests: digests, baselineIds: ['pack/a.json/1', 'pack/a.json/2', 'pack/b.json/1'], currentIds: ['pack/a.json/1', 'pack/a.json/2', 'pack/b.json/1'],
    baselineClasses: { 'pack/a.json/1': 'a', 'pack/a.json/2': 'b', 'pack/b.json/1': 'c' }, currentClasses: { 'pack/a.json/1': 'b', 'pack/a.json/2': 'd', 'pack/b.json/1': 'a' } })
  assert.deepEqual(v.regressions, ['pack/a.json/1'])
})

test('a baseline without classes compares blocked ids only', () => {
  const digests = { 'pack/a.json': 'x' }
  const v = classifyUpgrade({ baselineDigests: digests, currentDigests: digests, baselineIds: ['pack/a.json/1'], currentIds: ['pack/a.json/1'], currentClasses: { 'pack/a.json/1': 'b' } })
  assert.deepEqual(v.regressions, [])
})

test('only example tool defects and unmapped sources decide the upgrade bar', () => {
  const counts = upgradeClassCounts({
    'example/tests/upgrade-replay/examples/a.md/1': 'b',
    'example/tests/upgrade-replay/examples/a.md/2': 'd',
    'example/tests/upgrade-replay/examples/a.md/3': 'a',
    'pack/a.json/1': 'b',
    'pack/a.json/2': 'd',
    'pack/a.json/3': 'c',
  })
  assert.deepEqual(counts.example, { a: 1, b: 1, c: 0, d: 1 })
  assert.deepEqual(counts.pack, { a: 0, b: 1, c: 1, d: 1 })
  assert.equal(upgradeBarFail(counts), 2)
  assert.equal(upgradeBarFail(upgradeClassCounts({ 'pack/a.json/1': 'b', 'pack/a.json/2': 'd' })), 0)
})

test('a generated-pack class worsening remains a regression outside the bar', () => {
  const id = 'pack/a.json/1'
  const digests = { 'pack/a.json': 'x' }
  const verdict = classifyUpgrade({ baselineDigests: digests, currentDigests: digests, baselineIds: [id], currentIds: [id],
    baselineClasses: { [id]: 'a' }, currentClasses: { [id]: 'b' } })
  assert.deepEqual(verdict.regressions, [id])
  assert.equal(upgradeBarFail(upgradeClassCounts({ [id]: 'b' })), 0)
})
