import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const cases = JSON.parse(readFileSync(new URL('../spec/0.2/conformance/clause-cases.json', import.meta.url), 'utf8')).cases

// carve#6390: ids match under NFC (C2-I-097), and an id that is also a cross-reference target is no metadata-only target.
test('frontmatter-crossref looks ids up under NFC and skips an id that has a cross-reference target', () => {
  const row = model.rules.find(({ id }) => id === 'frontmatter-crossref')
  const owner = row.let.owner.lookup
  assert.deepEqual(owner.key, { nfc: { f: 'item.id' } })
  assert.deepEqual(owner.value, { nfc: { f: 'node.key' } })
  const target = row.let.target.lookup
  assert.equal(target.field, 'xref')
  assert.deepEqual(target.key, { if: [{ f: 'item.xref' }, { nfc: { f: 'item.id' } }, false] })
  assert.deepEqual(row.when, { all: [{ eq: [{ v: 'owner' }, 'frontmatter'] }, { not: { v: 'target' } }] })
})

test('the decomposed id and the shared heading id are pinned by clause cases', () => {
  const byId = new Map(cases.map((entry) => [entry.id, entry]))
  assert.ok(byId.get('CC-1663')?.expected.diagnostics.some(({ code }) => code === 'frontmatter-crossref'))
  for (const id of ['CC-1664', 'CC-1665']) assert.ok(byId.get(id)?.expected.notReported.includes('frontmatter-crossref'), id)
})
