import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))

test('a body header list kept in attrs makes no body-rows beside it (carve#6874)', () => {
  assert.equal(byId.get('CC-2472').expected.carve, '{body-header-rows=1 header-rows=0}\n|= h |\n')
  assert.equal(byId.get('CC-2473').expected.carve, '{body-header-cols=1 header-rows=0}\n|= h |\n')
  assert.equal(byId.get('CC-2474').expected.carve, '{body-header-rows=1 header-rows=1 footer-rows=1}\n|= h | d |\n|= h | < |\n')
})
