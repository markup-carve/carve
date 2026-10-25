import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseWithSourceLayout } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/ast-source-layout-fixtures.json', import.meta.url), 'utf8'))

test('the pinned JS engine matches every exact source-layout case', () => {
  for (const { name, source, layout, aheadOfPin } of fixtures.exact) {
    const actual = parseWithSourceLayout(source).layout
    if (aheadOfPin) {
      // Two-way: the pinned engine still writes the 1.2 paths and not yet the 2.0 ones.
      assert.notDeepEqual(actual, layout, `${name} is declared aheadOfPin but the pinned engine passes it: drop the flag`)
      assert.deepEqual(actual, { ...layout, nodes: aheadOfPin.pinnedNodes }, name)
      continue
    }
    assert.deepEqual(actual, layout, name)
  }
})
