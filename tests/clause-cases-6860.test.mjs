import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const cases = JSON.parse(read('../spec/0.2/conformance/clause-cases.json')).cases
const byId = new Map(cases.map((entry) => [entry.id, entry]))

test('a pipe table head the header marks cannot give is written with header-rows (carve#6860)', () => {
  assert.equal(byId.get('CC-2468').expected.carve, '{body-rows header-rows=0}\n|= a |\n')
  assert.equal(byId.get('CC-2469').expected.carve, '{header-rows=1 footer-rows=1 body-rows=0}\n|= a |\n|= b |\n')
  assert.equal(byId.get('CC-2470').expected.carve, '{body-rows=x header-rows=1}\n|= h |\n|= a |\n| 1 |\n')
  assert.equal(byId.get('CC-2471').expected.carve, '{body-rows=1 body-header-rows=1}\n|= h |\n| a |\n| 1 |\n')
})

test('heads the header marks give keep their output under the #6860 ruling', () => {
  assert.equal(byId.get('CC-2070').expected.carve, '{footer-rows=1 body-rows}\n|= A |\n|= F |\n')
  assert.equal(byId.get('CC-2242').expected.carve, '|= a |\n| 1 |\n')
  assert.equal(byId.get('CC-2249').expected.carve, '{footer-rows=2 body-rows}\n|= F |\n| x |\n')
})
