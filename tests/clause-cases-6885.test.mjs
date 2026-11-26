import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { readerChecks } from '../scripts/lib/spec2-reader.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))
const schema = new Ajv2020({ strict: true }).compile(JSON.parse(read('../spec/0.2/data/annotation-ranges.schema.json')))

test('an annotation range may carry declared data (carve#6885)', () => {
  const accepted = byId.get('CC-2480')
  assert.deepEqual(accepted.expected, { accepted: true })
  assert.deepEqual(accepted.annotations.ranges[0].data, { 'x.note': { by: 'a' } })
  const refused = byId.get('CC-2481')
  assert.deepEqual(refused.expected.refusal, { error: 'CarveTreeError', path: '/ranges/0/data' })
  assert.deepEqual(refused.annotations, accepted.annotations)
})

test('the range schema opens data and keeps the root and endpoints closed (carve#6885)', () => {
  const range = { id: 'r', start: { path: '', offset: 0 }, end: { path: '', offset: 0 } }
  assert.equal(schema({ ranges: [{ ...range, data: { 'x.note': 1 } }] }), true)
  assert.equal(schema({ ranges: [{ ...range, data: 1 }] }), false)
  assert.equal(schema({ ranges: [{ ...range, kind: 'comment' }] }), false)
  assert.equal(schema({ ranges: [range], data: {} }), false)
  assert.equal(schema({ ranges: [{ ...range, start: { ...range.start, data: {} } }] }), false)
})

test('the model reader refuses a node inside range data (carve#6885)', () => {
  const readerProblems = readerChecks(fileURLToPath(new URL('../spec/0.2', import.meta.url)))
  const entry = byId.get('CC-2480')
  const annotations = { ranges: [{ ...entry.annotations.ranges[0], data: { 'x.note': { type: 'text', value: 'a' } } }] }
  assert.deepEqual(readerProblems(entry.tree, { annotations }).map(({ path, clause }) => `${path} ${clause}`), ['/ranges/0/data/x.note C2-A-189'])
  assert.deepEqual(readerProblems(entry.tree, { annotations: entry.annotations }), [])
})
