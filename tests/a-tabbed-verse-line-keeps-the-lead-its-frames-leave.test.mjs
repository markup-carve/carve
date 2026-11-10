import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const verse = source => /<p>(.*)<\/p>\s*<\/div>/.exec(renderDoc(parse(source)))?.[1]

test('a tabbed verse line under an item keeps the lead of its per-frame space spelling (carve#5881)', () => {
  const four = '&nbsp;&nbsp;&nbsp;&nbsp;x'
  assert.equal(verse('- a\n  ::: |\n  \tx\n  :::\n'), four)
  assert.equal(verse('- a\n  ::: |\n      x\n  :::\n'), four)
  assert.equal(verse(':: t\n: d\n  ::: |\n  \tx\n  :::\n'), four)
  assert.equal(verse('> - a\n>   ::: |\n>   \tx\n>   :::\n'), four)
  assert.equal(verse('- a\n  ::: |\n  \t x\n  :::\n'), verse('- a\n  ::: |\n       x\n  :::\n'))
})

test('a top-level verse line still measures its tab from the line start', () => {
  assert.equal(verse(': t\n  ::: |\n  \tx\n  :::\n'), '&nbsp;&nbsp;x')
  assert.equal(verse('  ::: |\n  \tx\n  :::\n'), '&nbsp;&nbsp;x')
})
