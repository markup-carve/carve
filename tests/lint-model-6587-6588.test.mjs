import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const catalog = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-rules.json', import.meta.url), 'utf8'))
const cases = JSON.parse(readFileSync(new URL('../spec/0.2/conformance/clause-cases.json', import.meta.url), 'utf8')).cases

test('table-row-attribute-as-cell reads the last cell content as an attribute line (carve#6587)', () => {
  const row = model.rules.find(({ id }) => id === 'table-row-attribute-as-cell')
  const value = { f: 'node.children.-1.children.0.children.0.value' }
  assert.ok(row.when.all.some((test) => JSON.stringify(test) === JSON.stringify({ attribute_line: value })))
  assert.ok(row.when.all.some((test) => test.not?.has === 'node.children.-1.children.0.children.1'))
  assert.ok(row.when.all.some((test) => JSON.stringify(test) === JSON.stringify({ contains: [{ f: 'text' }, value] })))
  const byId = new Map(cases.map((entry) => [entry.id, entry]))
  for (const id of ['CC-2022', 'CC-2023', 'CC-2024', 'CC-2025', 'CC-2027']) {
    assert.ok(byId.get(id)?.expected.notReported.includes('table-row-attribute-as-cell'), id)
  }
  assert.ok(byId.get('CC-825')?.expected.diagnostics.some(({ code }) => code === 'table-row-attribute-as-cell'))
})

test('fence-closer-indented names the line of the opener (carve#6588)', () => {
  const entry = catalog.rules.find(({ id }) => id === 'fence-closer-indented')
  assert.deepEqual(entry.messages, [
    'This line closes the block opened on line ${line} although it is indented differently. If it is content, make the outer fence longer.',
  ])
  const row = model.rules.find(({ id }) => id === 'fence-closer-indented')
  assert.deepEqual(row.report.map((report) => report.values), [{ line: { f: 'line.number' } }])
})
