/*
 * An abbreviation definition that misses every frame defines at every column
 * below the content column; one that reaches a frame stays text (carve#4412).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()
const DEFINED = '<p><abbr title="b">A</abbr></p>'

const DEFINES = [
  ['an item', '- n\n *[A]: b', '<ul><li>n</li></ul>'],
  ['an indented item, left of its marker', '  - n\n *[A]: b', '<ul><li>n</li></ul>'],
  ['an indented item, at its marker', ' - n\n *[A]: b', '<ul><li>n</li></ul>'],
  ['an ordered item', '1. n\n  *[A]: b', '<ol><li>n</li></ol>'],
  ['a wide ordered item', '10. n\n   *[A]: b', '<ol start="10"><li>n</li></ol>'],
  ['a nested item', '- - n\n *[A]: b', '<ul><li><ul><li>n</li></ul></li></ul>'],
  ['a quote in an item', '- > n\n *[A]: b', '<ul><li><blockquote><p>n</p></blockquote></li></ul>'],
  ['a second paragraph', '- a\n\n  n\n *[A]: b', '<ul><li><p>a</p><p>n</p></li></ul>'],
  ['a description', ':: t\n: n\n *[A]: b', '<dl><dt>t</dt><dd>n</dd></dl>'],
  ['a wide description', ':: t\n:  n\n  *[A]: b', '<dl><dt>t</dt><dd>n</dd></dl>'],
  ['a quote', '> n\n *[A]: b', '<blockquote><p>n</p></blockquote>'],
]

for (const [name, host, out] of DEFINES) {
  test(`below ${name} the definition defines`, () => {
    assert.equal(html(`${host}\n\nA\n`), `${out}${DEFINED}`)
  })
}

test('below a note the definition defines and the note ends', () => {
  const out = html('[^f]: n\n *[A]: b\n\nA[^f]\n')
  assert.ok(out.includes('<abbr title="b">A</abbr>'), out)
  assert.ok(!out.includes('*[A]: b'), out)
})

test('frontmatter does not move which line missed its frames', () => {
  assert.equal(html('---\nk: v\n---\n- n\n *[A]: b\n\nA\n'), `<ul><li>n</li></ul>${DEFINED}`)
})

const STAYS_TEXT = [
  ['at an item content column', '- n\n  *[A]: b\n\nA\n', '<ul><li>n *[A]: b</li></ul><p>A</p>'],
  ['at a wide content column', '10. n\n    *[A]: b\n\nA\n', '<ol start="10"><li>n *[A]: b</li></ol><p>A</p>'],
  ['reaching an outer item', '- - n\n  *[A]: b\n\nA\n', '<ul><li><ul><li>n *[A]: b</li></ul></li></ul><p>A</p>'],
  ['between an outer and an inner item', '- - n\n   *[A]: b\n\nA\n', '<ul><li><ul><li>n *[A]: b</li></ul></li></ul><p>A</p>'],
  ['reaching the item around a quote', '- > n\n  *[A]: b\n\nA\n', '<ul><li><blockquote><p>n *[A]: b</p></blockquote></li></ul><p>A</p>'],
  ['past an open term', ':: t\n *[A]: b\n\nA\n', '<dl><dt>t *[A]: b</dt></dl><p>A</p>'],
]

for (const [name, src, out] of STAYS_TEXT) {
  test(`a line ${name} stays text`, () => {
    assert.equal(html(src), out)
  })
}

test('a div is not the document, so the indented line stays in its item', () => {
  assert.ok(html('::: note\n- n\n *[A]: b\n:::\n\nA\n').includes('n *[A]: b'))
})
