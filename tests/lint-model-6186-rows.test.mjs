import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => JSON.parse(readFileSync(new URL(`../spec/0.2/data/${path}`, import.meta.url), 'utf8'))
const model = read('lint-model.json')
const catalog = read('lint-rules.json').rules
const cases = JSON.parse(readFileSync(new URL('../spec/0.2/conformance/clause-cases.json', import.meta.url), 'utf8')).cases

// carve#6186: each active lint rule is stated as data or names in `hand_written` what the line model lacks (C2-W-139).
test('nine rows of #6186 are data and the seven others stay hand-written', () => {
  const stated = new Set(model.rules.map(({ id }) => id))
  for (const id of ['carve-version-unsupported', 'deprecated-indented-line-under-heading', 'djot-intraword-underscore',
    'emphasis-marker-before-attributes', 'figure-group-panel-number', 'sigil-after-letter', 'unattached-inline-attribute',
    'unclosed-braced-comment', 'unclosed-inline-emphasis']) assert.ok(stated.has(id), id)
  const hand = catalog.filter((row) => row.hand_written !== undefined).map(({ id }) => id)
  assert.deepEqual(hand, ['bidi-control-in-source', 'braced-span-opener-as-text', 'comment-in-reference-label',
    'deprecated-substitution-arrow', 'non-descriptive-link-text', 'platform-issue-reference', 'platform-mention-token'])
  for (const id of hand) assert.ok(!stated.has(id), id)
})

test('the catalog readings of the new rows are pinned by clause cases', () => {
  const byId = new Map(cases.map((entry) => [entry.id, entry]))
  const pinned = { 'CC-1729': 'sigil-after-letter', 'CC-1730': 'sigil-after-letter', 'CC-1731': 'djot-intraword-underscore',
    'CC-1732': 'djot-intraword-underscore', 'CC-1733': 'deprecated-indented-line-under-heading', 'CC-1734': 'unclosed-braced-comment',
    'CC-1735': 'unclosed-braced-comment', 'CC-1736': 'unclosed-inline-emphasis', 'CC-1737': 'unclosed-inline-emphasis',
    'CC-1738': 'unclosed-inline-emphasis', 'CC-1739': 'unclosed-inline-emphasis', 'CC-1740': 'unclosed-inline-emphasis',
    'CC-1741': 'emphasis-marker-before-attributes', 'CC-1742': 'emphasis-marker-before-attributes',
    'CC-1743': 'carve-version-unsupported', 'CC-1744': 'carve-version-unsupported', 'CC-1745': 'carve-version-unsupported',
    'CC-1746': 'unattached-inline-attribute', 'CC-1747': 'unattached-inline-attribute', 'CC-1748': 'unattached-inline-attribute',
    'CC-1749': 'unattached-inline-attribute' }
  for (const [id, code] of Object.entries(pinned)) {
    const expected = byId.get(id)?.expected
    assert.ok(expected?.diagnostics?.some((entry) => entry.code === code) || expected?.notReported?.includes(code), id)
  }
})
