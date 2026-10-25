import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseWithSourceLayout } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/ast-source-layout-fixtures.json', import.meta.url), 'utf8'))

test('the pinned JS engine matches every exact source-layout case', () => {
  for (const { name, source, layout } of fixtures.exact) {
    const actual = parseWithSourceLayout(source).layout
    assert.deepEqual(actual, layout, name)
  }
})
