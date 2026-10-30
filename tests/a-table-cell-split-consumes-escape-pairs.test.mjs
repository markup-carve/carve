// PART 9 §5 T1 with CARVE-P7-004 and carve#4174: the cell split is an escape
// scan, so a doubled backslash is one escape and the pipe after it separates.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cells = (source) => [...renderDoc(parse(source)).matchAll(/<td>(.*?)<\/td>/g)].map((m) => m[1])

test('a backslash run before a pipe separates on an even count', () => {
  assert.deepEqual(cells('| a \\\\| b |\n'), ['a \\', 'b'])
  assert.deepEqual(cells('| a \\\\\\| b |\n'), ['a \\| b'])
  assert.deepEqual(cells('| a \\\\\\\\| b |\n'), ['a \\\\', 'b'])
})

test('an escaped backtick opens no code span in a cell', () => {
  assert.deepEqual(cells('| a \\`b | c |\n'), ['a `b', 'c'])
  assert.deepEqual(cells('| a \\\\`b` | c |\n'), ['a \\<code>b</code>', 'c'])
})
