import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// PART 0 S2/S4: the line reaches the enclosing owner, then folds into the
// deepest open paragraph, even when that paragraph belongs to a note below
// several descriptions (carve#5721).
for (const host of ['document', 'list item', 'ordered item']) {
  for (let depth = 1; depth <= 4; depth++) {
    test(`a note takes a lazy line through ${depth} descriptions in ${host}`, () => {
      const base = host === 'document' ? 0 : host === 'list item' ? 2 : 3
      const lines = host === 'document' ? [] : [host === 'list item' ? '- x' : '1. x']
      for (let level = 0; level < depth; level++) {
        const pad = ' '.repeat(base + 2 * level)
        lines.push(`${pad}:: t`, `${pad}: a`)
      }
      lines.push(`${' '.repeat(base + 2 * depth)}[^n]: a`, `${' '.repeat(base)}p`)
      const source = lines.join('\n') + '\n'
      const parsed = parse(source)
      assert.deepEqual(parsed.footnoteDefs.get('n'), [{ t: 'para', lines: ['a', 'p'] }], source)
      assert.doesNotMatch(renderDoc(parsed), /<p>p<\/p>/, source)
    })
  }
}
