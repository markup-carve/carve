import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

const ownerOf = (source, line) => {
  const trace = []
  parse(source, { trace })
  return trace.filter((row) => row.line === line).at(-1)
}

test('a lazy line after a multi-line comment run is traced in the open paragraph, as after a one-line run (carve#5795)', () => {
  assert.equal(ownerOf('- {% a %}\nplain\n', 2).owner, 'doc/item:1')
  for (const [source, line, owner] of [
    ['- {% a\n   b\n   z %}\nplain\n', 4, 'doc/item:1'],
    ['- p\n  {% a\n   ```\n   z %}\nplain\n', 5, 'doc/item:1'],
    ['> {% a\n>  b\n>  z %}\nplain\n', 4, 'doc/quote:1'],
    ['- {% a\n   - li\n   z %} y\nplain\n', 4, 'doc/item:1'],
  ]) {
    const row = ownerOf(source, line)
    assert.equal(row.owner, owner, JSON.stringify(source))
    assert.equal(row.rule, 'CARVE-P0-006', JSON.stringify(source))
  }
})
