import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4229: a quote is reached by its marker, never by indentation (PART 0 S2),
// so the run before a follower's `>` does not move it off the note's quote level.
const html = (source) => renderDoc(parse(source))
const note = (body) => html(`> [^b]: +\n${body}\n\nr[^b]\n`).replace(/^[\s\S]*<li id="fn1">\s*/, '').replace(/<a href="#fnref1"[\s\S]*$/, '')

test('a paragraph behind an indented quote marker is the note block', () => {
  assert.equal(note('  > para'), '<p>para')
  for (const lead of ['', ' ', '  ', '   ', '\t']) assert.equal(note(`${lead}> para`), note('> para'))
})

test('a heading and other blocks behind an indented quote marker read as unindented', () => {
  assert.equal(note('  > # H'), '<h1 id="H">H</h1>\n      <p>')
  for (const block of ['# H', '> q', '{.c}\n  > para', '%% c', '| a |']) {
    assert.equal(note(`  > ${block}`), note(`> ${block.replace(/^ {2}> /m, '> ')}`))
  }
})

test('spacing after the quote marker still decides the column', () => {
  assert.equal(note(' >  para'), note('>  para'))
  assert.equal(html('>  [^b]: +\n > para\n\nr[^b]\n'), html('>  [^b]: +\n> para\n\nr[^b]\n'))
})
