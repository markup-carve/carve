import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))

function operators(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) operators(item, found)
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'plain_list' || key === 'quoted_list') found.push(key)
      operators(item, found)
    }
  }
  return found
}

test('case-only phrases use the unquoted list specified after the 6358 correction', () => {
  for (const id of ['broken-crossref', 'unresolved-reference-link']) {
    const row = model.rules.find((entry) => entry.id === id)
    assert.ok(row, id)
    const listOps = operators(row)
    assert.ok(listOps.includes('plain_list'), `${id} must form a plain list`)
    assert.ok(!listOps.includes('quoted_list'), `${id} must not quote the phrase`)
  }
})
