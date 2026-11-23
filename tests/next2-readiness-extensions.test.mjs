import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extensionFailures, extensionGate, extensionReport } from '../scripts/next2-readiness-extensions.mjs'
import { caseKey, caseFingerprint, classify } from '../scripts/next2-readiness-classify.mjs'

const read = path => JSON.parse(readFileSync(new URL(`../spec/0.2/${path}`, import.meta.url), 'utf8'))
const corpus = read('conformance/extensions.json')
const catalog = new Set(read('data/extensions.json').extensions.map(e => e.name))

test('the extension report tallies each engine per extension and lists what does not pass', () => {
  const cases = [{ id: 'EXT-001', extension: 'carve.a' }, { id: 'EXT-002', extension: 'carve.a' }, { id: 'EXT-003', extension: 'carve.b' }]
  const results = {
    js: [{ id: 'EXT-001', extension: 'carve.a', status: 'pass', fields: [] }, { id: 'EXT-002', extension: 'carve.a', status: 'pass', fields: [] }, { id: 'EXT-003', extension: 'carve.b', status: 'pass', fields: [] }],
    rs: [{ id: 'EXT-001', extension: 'carve.a', status: 'fail', fields: ['html'] }, { id: 'EXT-002', extension: 'carve.a', status: 'pass', fields: [] }, { id: 'EXT-003', extension: 'carve.b', status: 'unsupported', fields: ['not offered'] }],
  }
  const lines = extensionReport(cases, results)
  assert.equal(lines[0], '## Extensions')
  assert.ok(lines.includes('| carve.a | 2 | 2 | 0 | 0 | 1 | 1 | 0 |'))
  assert.ok(lines.includes('| carve.b | 1 | 1 | 0 | 0 | 0 | 0 | 1 |'))
  assert.ok(lines.includes('| **Total** | 3 | 3 | 0 | 0 | 1 | 1 | 1 |'))
  assert.ok(lines.includes('rs extension cases not passing: `EXT-001` (fail: html), `EXT-003` (unsupported: not offered).'))
  assert.ok(!lines.some(line => line.startsWith('js extension cases not passing')))
})

test('extension failures and unsupported cases gate every engine', () => {
  const results = {
    js: [{ kind: 'render', id: 'EXT-001', status: 'pass' }],
    php: [{ kind: 'render', id: 'EXT-001', status: 'fail' }],
    rs: [{ kind: 'render', id: 'EXT-001', status: 'unsupported' }],
  }
  assert.deepEqual(extensionFailures(results), [
    'php/extensions/render/EXT-001: fail',
    'rs/extensions/render/EXT-001: unsupported',
  ])
  assert.deepEqual(extensionFailures({ js: results.js }), [])
})

test('with a baseline, extension cases are gated per case: a changed message is a gap, an unchanged regression fails', () => {
  const ext = { area: 'extensions', kind: 'render', id: 'EXT-010', extension: 'carve.details', input: 'a\n', expected: { html: '<p>a</p>', diagnostics: ['extension-fallback-rendered'] } }
  const rule = messages => new Map([['extension-fallback-rendered', { messages }]])
  const before = caseFingerprint(ext, rule(['old ${name}']))
  const key = caseKey(ext)
  const failed = ['js/extensions/render/EXT-010: fail']
  const changed = classify({ baselineCases: { [key]: before }, currentCases: { [key]: caseFingerprint(ext, rule(['new ${name}'])) }, currentFailures: { [key]: 'fail' } })
  assert.deepEqual(changed.regressions, [])
  assert.deepEqual(changed.gaps.unlisted, [{ key, now: 'fail', reason: 'changed' }])
  assert.deepEqual(extensionGate(failed, true), [])
  const unchanged = classify({ baselineCases: { [key]: before }, currentCases: { [key]: before }, currentFailures: { [key]: 'fail' } })
  assert.deepEqual(unchanged.regressions, [{ key, old: 'pass', now: 'fail' }])
  assert.deepEqual(extensionGate(failed, false), failed)
})

test('every extension case names its extension, its source and an expectation it can check', () => {
  assert.equal(corpus.kind, 'extensions')
  corpus.cases.forEach((c, index) => {
    assert.equal(c.id, `EXT-${String(index + 1).padStart(3, '0')}`, 'ids run in order')
    assert.equal(c.kind, 'render', c.id)
    assert.match(c.extension, /^carve\.[A-Za-z][\w.-]*$/, c.id)
    assert.ok(c.options.extensions.includes(c.extension) || c.options.extensions.some(name => catalog.has(name) && c.extension.startsWith(name)), `${c.id} enables ${c.extension}`)
    assert.ok(c.expectedFrom === '0.2' || c.expectedFrom.startsWith('0.1: '), `${c.id} says where its expectation comes from`)
    if (c.expectedFrom === '0.2') assert.ok(c.clauses.length > 0, `${c.id} cites the 0.2 clause it follows`)
    assert.ok(c.expected.html !== undefined || c.expected.htmlIncludes !== undefined, `${c.id} states HTML`)
    assert.ok(typeof c.summary === 'string' && c.summary.length > 0, c.id)
  })
})

test('every extension of data/extensions.json that a matcher claims has cases', () => {
  const covered = new Set(corpus.cases.map(c => c.extension))
  for (const entry of read('data/extensions.json').extensions) if (entry.matcher) assert.ok(covered.has(entry.name), entry.name)
})
