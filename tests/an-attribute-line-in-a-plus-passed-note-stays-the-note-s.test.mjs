import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const note = source => /<li id="fn1">\s*([\s\S]*?)\s*<\/li>/.exec(html(source))?.[1]

test('an attribute line in a note a plus looks past is dropped with the note (carve#5957)', () => {
  for (const lead of ['\t', '  ', '   ', '    ']) {
    const out = html(`- +\n[^m]: n\n${lead}{y}\n\n[^m]\n`)
    assert.doesNotMatch(out, /y=""/)
    assert.match(note(`- +\n[^m]: n\n${lead}{y}\n\n[^m]\n`), /^<p>n<a /)
  }
})

test('the line after the attribute is the plus block, not lazy note text (carve#5957)', () => {
  for (const lead of ['  ', '   ', '\t']) {
    assert.match(html(`- +\n[^m]: n\n${lead}{y}\nq\n\np[^m]\n`), /<ul>\n  <li>q<\/li>\n<\/ul>/)
  }
  assert.match(html('- +\n[^m]: n\n  {y\n   z}\nq\n\np[^m]\n'), /<ul>\n  <li>q<\/li>\n<\/ul>/)
  assert.match(html('1. +\n[^m]: n\n   {y}\nq\n\np[^m]\n'), /<li>q<\/li>/)
})

test('a plus reads the passed note as the note reads without it', () => {
  const body = note('[^m]: n\n  {y}\n  m\n\n[^m]\n')
  assert.equal(note('- +\n[^m]: n\n  {y}\n  m\n\n[^m]\n'), body)
})
