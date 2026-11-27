import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))

test('a source footnote reference without a number is resolved by its definition (C2-N-092)', () => {
  const rule = model.rules.find(({ id }) => id === 'unresolved-footnote')
  assert.deepEqual(rule.when.all[0], { not: { has: 'node.number' } })
  const lookup = rule.when.all[1].not.ge[0].lookup
  assert.deepEqual(lookup.types, ['footnote'])
  assert.deepEqual(lookup.key, { f: 'item.node.key' })
  assert.deepEqual(lookup.value, { f: 'node.key' })
})
