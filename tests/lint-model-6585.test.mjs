import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const model = JSON.parse(read('../spec/0.2/data/lint-model.json'))
const catalog = JSON.parse(read('../spec/0.2/data/lint-rules.json'))
const cases = new Map(JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases.map((entry) => [entry.id, entry]))
const writer = read('../spec/0.2/writer.md')

test('canonical output passes unattached-caption (carve#6585 A1)', () => {
  const clause = writer.split('\n').find((line) => line.startsWith('**C2-W-146**'))
  assert.match(clause, /Canonical output also passes `unattached-caption`/)
  assert.match(clause, /the caret takes a backslash/)
  for (const id of ['CC-2029', 'CC-2030', 'CC-2031', 'CC-2032', 'CC-2033', 'CC-2034', 'CC-2035']) {
    const entry = cases.get(id)
    assert.equal(entry?.kind, 'format', id)
    assert.match(entry.expected.carve, /(^|\n)(> )?\\\^ /, id)
  }
  assert.equal(cases.get('CC-2036')?.expected.carve, '| a |\n^ cap\n')
  assert.equal(cases.get('CC-2037')?.expected.carve, '\\^ x\n')
  assert.deepEqual(cases.get('CC-2038')?.expected.notReported, ['unattached-caption'])
})

test('fence-closer-indented counts a marker-line opener from the content column (carve#6585 A2)', () => {
  const row = model.rules.find(({ id }) => id === 'fence-closer-indented')
  const exempt = row.when.all.at(-1).not.all
  assert.deepEqual(exempt[0], { in: [{ f: 'owner.type' }, ['list_item', 'description', 'footnote']] })
  assert.deepEqual(exempt[2], { le: [{ column: [{ match: 'close' }, { f: 'last_line.quote_depth' }] }, { f: 'owner.content_column' }] })
  assert.deepEqual(row.clauses, ['C2-B-027', 'C2-B-108', 'C2-B-109'])
  const entry = catalog.rules.find(({ id }) => id === 'fence-closer-indented')
  assert.match(entry.reports, /a closer at or left of its content column stands where the opener does and is not reported/)
  for (const id of ['CC-2026', 'CC-2039', 'CC-2040']) {
    assert.deepEqual(cases.get(id)?.expected.notReported, ['fence-closer-indented'], id)
  }
  for (const id of ['CC-2041', 'CC-2042', 'CC-2043', 'CC-2044', 'CC-747']) {
    assert.ok(cases.get(id)?.expected.diagnostics.some(({ code }) => code === 'fence-closer-indented'), id)
  }
})
