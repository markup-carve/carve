/*
 * A nonblank line that misses a span's owner ends the span and is classified in its
 * selected owner (CARVE-P0-005). The opener opens with no closer ahead, so its payload stays
 * hidden, and a later same-width line opens a new span where it stands (carve#4907). A `+`
 * skip reads the same span, so it cannot run past a line that left the host (carve#4870).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s*\n\s*/g, '')

for (const [marker, list] of [['.', 'ol'], ['-', 'ul']]) {
  for (const closer of ['%%%', ' %%%', '  %%%', '    %%%']) {
    const nested = (line) => `${marker} a\n  ${marker} %%%\n    n\n${line}\n${closer}\n`
    // A late run below the outer item's column opens a document-level span that hides `x`.
    const after = closer.length - closer.trimStart().length < 2 ? '' : '<p>x</p>'
    test(`${marker} list: a line below every host leaves the list, closer ${JSON.stringify(closer)}`, () => {
      assert.equal(html(nested('>>')), `<${list}><li>a<${list}><li></li></${list}></li></${list}><p>&gt;&gt;</p>`)
    })
    test(`${marker} list: a line at the outer column stays in the outer item, closer ${JSON.stringify(closer)}`, () => {
      assert.equal(html(nested('  zz')), `<${list}><li>a<${list}><li></li></${list}>zz</li></${list}>`)
    })
    test(`${marker} list: a shallower quote keeps no claim past the late run, closer ${JSON.stringify(closer)}`, () => {
      assert.equal(html(`${nested('  > q')}x\n`), `<${list}><li>a<${list}><li></li></${list}><blockquote><p>q</p></blockquote></li></${list}>${after}`)
    })
    test(`${marker} list: the late run leaves no paragraph for the next line, closer ${JSON.stringify(closer)}`, () => {
      assert.equal(html(`${nested('  zz')}x\n`), `<${list}><li>a<${list}><li></li></${list}>zz</li></${list}>${after}`)
    })
  }
  test(`${marker} list: with no closer ahead the payload stays hidden`, () => {
    assert.equal(html(`${marker} a\n  ${marker} %%%\n    n\n  zz\n`), html(`${marker} a\n  ${marker} %%%\n    n\n    %%%\n  zz\n`))
  })
  test(`${marker} list: a depth of three reads the same`, () => {
    assert.equal(html(`${marker} a\n  ${marker} b\n    ${marker} %%%\n      n\n    zz\n%%%\n`), html(`${marker} a\n  ${marker} b\n    ${marker} %%%\n      n\n    zz\n    %%%\n`))
  })
  test(`${marker} list: a second run below the closer stays out of the item`, () => {
    assert.equal(html(`${marker} a\n  ${marker} %%%\n    n\n  zz\n%%%\n%%%\nx\n`), html(`${marker} a\n  ${marker} %%%\n    n\n  zz\n  %%%\n%%%\nx\n`))
  })
}

const refused = '<blockquote><ul><li>+</li></ul></blockquote>'

// The late run opens a new span in its own host, which hides what follows it there.
test('a + skip stops at a blank line that left the quote', () => {
  assert.equal(html('> - +\n> %%%\n\n> %%%\n> text\n'), `${refused}<blockquote></blockquote>`)
})

test('a + skip stops at a text line that left the quote', () => {
  assert.equal(html('> - +\n> %%%\ntext\n> %%%\n> x\n'), `${refused}<p>text</p><blockquote></blockquote>`)
})

test('a + skip stops at a line below the host column', () => {
  assert.equal(html('- a\n  - +\n  %%%\nzz\n  %%%\n  # H\n'), html('- a\n  - +\n  %%\nzz\n'))
})

test('a + skip still takes the block past a span its quote closes', () => {
  assert.equal(html('> - +\n> %%%\n> h\n> %%%\n> # H\n'), html('> - +\n> # H\n'))
})
