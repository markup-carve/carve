import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4409: the follower's column is absolute, so a run before its `>` moves it off the note's marker column.
const html = (source) => renderDoc(parse(source))
const note = (body) => html(`> [^b]: +\n${body}\n\nr[^b]\n`).replace(/^[\s\S]*<li id="fn1">\s*/, '').replace(/<a href="#fnref1"[\s\S]*$/, '')
const asLetter = (body) => html(`> [^b]: x\n${body}\n\nr[^b]\n`).replace('<p>x', '<p>+')

test('a paragraph behind an indented quote marker refuses the +', () => {
  assert.equal(note('> para'), '<p>para')
  for (const lead of [' ', '  ', '   ', '\t']) assert.equal(note(`${lead}> para`), '<p>+\npara')
})

test('a heading and other blocks behind an indented quote marker read as behind a letter', () => {
  assert.equal(note('> # H'), '<h1 id="H">H</h1>\n      <p>')
  assert.equal(note('  > # H'), '<p>+')
  for (const block of ['# H', '> q', '{.c}\n  > para', '%% c', '| a |']) {
    assert.equal(html(`> [^b]: +\n  > ${block}\n\nr[^b]\n`), asLetter(`  > ${block}`))
  }
})

test('spacing before and after the quote marker both count toward the column', () => {
  assert.equal(note(' >  para'), '<p>+\npara')
  assert.equal(html('>  [^b]: +\n > para\n\nr[^b]\n'), html('>  [^b]: +\n>  para\n\nr[^b]\n'))
  assert.notEqual(html('>  [^b]: +\n> para\n\nr[^b]\n'), html('>  [^b]: +\n>  para\n\nr[^b]\n'))
})
