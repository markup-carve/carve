import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const model = JSON.parse(read('../spec/0.2/data/lint-model.json'))
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))

test('table-row-count-clamped clamps header-rows on a pipe table too (carve#6838, C2-B-186)', () => {
  const row = model.rules.find(({ id }) => id === 'table-row-count-clamped')
  const branch = row.when.all.at(-1).any.find(({ all }) => all.some((c) => c.eq?.[1] === 'header-rows'))
  assert.ok(branch)
  assert.ok(!JSON.stringify(branch).includes('owner.format'))
  assert.deepEqual(byId.get('CC-2241').expected.diagnostics.map(({ code }) => code), ['table-row-count-clamped'])
})
