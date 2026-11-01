// Cell splitting runs before the inline pass, so no inline construct sees the
// backslash of a cell's `\|` outside a backtick run (carve#4718).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cell = (source) => /<td>([\s\S]*?)<\/td>/.exec(renderDoc(parse(source)))?.[1]

test('an unresolved reference keeps no backslash', () => {
  assert.equal(cell('| [a\\|b][m] |\n'), '[a|b][m]')
  assert.equal(cell('| ![a\\|b][m] |\n'), '![a|b][m]')
  assert.equal(cell('| [a\\|b][m] \\|\n'), '[a|b][m] |')
})

test('a label with an escaped pipe matches a plain-pipe definition', () => {
  assert.equal(cell('| [x][r\\|s] |\n\n[r|s]: /u\n'), '<a href="/u">x</a>')
})

test('a backtick run keeps the escape as written', () => {
  assert.equal(cell('| `a\\|b` [c\\|d] |\n'), '<code>a\\|b</code> [c|d]')
  assert.equal(cell('| `` a\\|b `` \\| |\n'), '<code>a\\|b</code> |')
})

test('an escaped backslash before a pipe is unchanged', () => {
  assert.equal(cell('| [a\\\\][m] |\n'), '[a\\\\][m]')
})
