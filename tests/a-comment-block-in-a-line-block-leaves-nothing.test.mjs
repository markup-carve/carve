import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const verse = (...body) => html(`::: |\n${body.join('\n')}\n:::\n`)

test('a pair hides its body and leaves no verse line (carve#4469)', () => {
  assert.equal(verse('%%%', 'secret', '%%%'), '<div class="line-block">\n\n</div>')
  assert.equal(verse('a', '%%%', 'secret', '%%%', 'c'), '<div class="line-block">\n  <p>a<br>\nc</p>\n</div>')
})

test('a blank line in the body splits no stanza, one around the pair does', () => {
  assert.equal(verse('a', '%%%', 'x', '', 'y', '%%%', 'c'), verse('a', 'c'))
  assert.equal(verse('a', '', '%%%', 'x', '%%%', '', 'c'), verse('a', '', 'c'))
})

test('the closer takes the exact delimiter length, an indent and a tail', () => {
  assert.equal(verse('%%%%', '%%%', 'x', '%%%%'), verse())
  assert.equal(verse('%%% note', 'x', '  %%% end', 'c'), verse('c'))
})

test('a fence with no closer stays a comment line and an indented opener stays verse', () => {
  assert.equal(verse('%%%', 'x'), verse('%% c', 'x'))
  assert.match(verse('  %%%', 'x', '  %%%'), /&nbsp;&nbsp;%%%<br>\nx<br>/)
})

test('a line block in a container reads a pair the same way', () => {
  assert.doesNotMatch(html('- ::: |\n  %%%\n  secret\n  %%%\n  :::\n'), /secret/)
  assert.doesNotMatch(html('> ::: |\n> %%%\n> secret\n> %%%\n> :::\n'), /secret/)
})

test('a colon run inside the pair is hidden and closes nothing', () => {
  assert.equal(verse('%%%', ':::', '%%%', 'after'), verse('after'))
})
