/*
 * An abbreviation definition at source column 0 ends every container and
 * defines, like a reference definition (carve#4412).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

const DEFINES = [
  ['item', '- n', '<ul><li>n</li></ul>'],
  ['ordered item', '1. n', '<ol><li>n</li></ol>'],
  ['nested item', '- - n', '<ul><li><ul><li>n</li></ul></li></ul>'],
  ['quote in an item', '- > n', '<ul><li><blockquote><p>n</p></blockquote></li></ul>'],
  ['description', ':: t\n: n', '<dl><dt>t</dt><dd>n</dd></dl>'],
  ['term', ':: t', '<dl><dt>t</dt></dl>'],
  ['nested quote', '> > n', '<blockquote><blockquote><p>n</p></blockquote></blockquote>'],
  ['document-level quote', '> n', '<blockquote><p>n</p></blockquote>'],
]

for (const [name, host, out] of DEFINES) {
  test(`an abbreviation definition at column 0 below a ${name} defines`, () => {
    assert.equal(html(`${host}\n*[A]: b\n\nA\n`), `${out}<p><abbr title="b">A</abbr></p>`)
  })
  test(`a reference definition at column 0 below a ${name} resolves`, () => {
    assert.equal(html(`${host}\n[r]: /u\n\n[x][r]\n`), `${out}<p><a href="/u">x</a></p>`)
  })
}

test('a footnote body ends and the abbreviation defines', () => {
  const out = html('[^f]: n\n*[A]: b\n\nA[^f]\n')
  assert.ok(out.includes('<abbr title="b">A</abbr>'), out)
  assert.ok(!out.includes('*[A]: b'), out)
})

const STAYS_TEXT = [
  ['the item content column', '- n\n  *[A]: b\n\nA\n', '<ul><li>n *[A]: b</li></ul><p>A</p>'],
  ['an outer item content column', '- - n\n  *[A]: b\n\nA\n', '<ul><li><ul><li>n *[A]: b</li></ul></li></ul><p>A</p>'],
  ['a quote marker', '> n\n> *[A]: b\n\nA\n', '<blockquote><p>n *[A]: b</p></blockquote><p>A</p>'],
  ['a description body', ':: t\n: n\n  *[A]: b\n\nA\n', '<dl><dt>t</dt><dd>n *[A]: b</dd></dl><p>A</p>'],
  ['past a term', ':: t\n  *[A]: b\n\nA\n', '<dl><dt>t *[A]: b</dt></dl><p>A</p>'],
]

for (const [name, src, out] of STAYS_TEXT) {
  test(`a line at ${name} stays text`, () => {
    assert.equal(html(src), out)
  })
}

test('a frontmatter block does not move the column-0 line', () => {
  assert.equal(html('---\nk: v\n---\n- n\n*[A]: b\n\nA\n'), '<ul><li>n</li></ul><p><abbr title="b">A</abbr></p>')
})

test('a div is not the document, so the line stays in its item', () => {
  assert.ok(html('::: note\n- n\n*[A]: b\n:::\n\nA\n').includes('n *[A]: b'))
})
