import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const verse = source => /<p>(.*)<\/p>\s*<\/div>/.exec(renderDoc(parse(source)))?.[1]

test('a tabbed verse under an opener past its frame column keeps its per-frame lead less the opener (carve#5885)', () => {
  const three = '&nbsp;&nbsp;&nbsp;x'
  assert.equal(verse('- a\n   ::: |\n  \tx\n   :::\n'), three)
  assert.equal(verse('- a\n   ::: |\n    \tx\n   :::\n'), three)
  assert.equal(verse('- a\n  \t::: |\n    \tx\n  \t:::\n'), 'x')
  assert.equal(verse('> - a\n>    ::: |\n>   \tx\n>    :::\n'), three)
})

test('a tabbed spelling keeps the lead of its per-frame space spelling', () => {
  assert.equal(verse('- a\n   ::: |\n  \tx\n   :::\n'), verse('- a\n   ::: |\n      x\n   :::\n'))
  assert.equal(verse('- a\n  \t::: |\n      x\n  \t:::\n'), verse('- a\n      ::: |\n      x\n      :::\n'))
  assert.equal(verse('- a\n  - b\n     ::: |\n    \t x\n     :::\n'), verse('- a\n  - b\n     ::: |\n         x\n     :::\n'))
})
