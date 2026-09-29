/*
 * carve#2570, second shape. A quote's compact spelling was decided by an AST
 * child count, so a visible paragraph beside a dropped raw block counted two and
 * framed a one-element body on three lines. The pinned carve-js reads the same
 * shape compactly, and PART 10 SS4 gives a line to each block ELEMENT.
 *
 * The first shape of that ticket is PARKED, not decided the other way. A footnote
 * body whose only block is a dropped raw keeps its blank line here, and carve-js
 * and carve-php both omit it, for that body and for a comment-only body alike. The
 * claim that the engines agreed with this renderer came from a comment in
 * html.mjs rather than from a measurement, so carve#2570 holds the question open.
 *
 * The assertion below therefore pins CURRENT behavior, not a ruling. The two
 * shapes share one mechanism, and its job is to stop a change to the child count
 * from moving the body slot as a side effect. When the parked question is answered
 * it may need to flip, and it says so here rather than reading as settled.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a quote holding a paragraph and a dropped raw block takes the compact spelling', () => {
  assert.equal(
    html('> a\n>\n> ```=latex\n> \\x\n> ```\n'),
    '<blockquote><p>a</p></blockquote>',
  )
})

test('every non-matching raw format reads the same way, including an empty payload', () => {
  for (const source of [
    '> a\n>\n> ```=foo\n> \\x\n> ```\n',
    '> a\n>\n> ```=latex\n> ```\n',
    '> ```=latex\n> \\x\n> ```\n>\n> a\n',
  ]) {
    assert.equal(html(source), '<blockquote><p>a</p></blockquote>', source)
  }
})

test('a raw block the html target DOES match still counts', () => {
  assert.equal(
    html('> a\n>\n> ```=html\n> <b>x</b>\n> ```\n'),
    '<blockquote>\n  <p>a</p>\n  <b>x</b>\n</blockquote>',
  )
})

test('a quote whose every child renders nothing keeps the body slot', () => {
  assert.equal(html('> ```=latex\n> \\x\n> ```\n'), '<blockquote>\n\n</blockquote>')
})

test('two visible paragraphs are still two lines', () => {
  assert.equal(html('> a\n>\n> b\n'), '<blockquote>\n  <p>a</p>\n  <p>b</p>\n</blockquote>')
})

// Current behavior, not a ruling: carve#2570 parks which side moves.
test('a footnote body whose only block is a dropped raw keeps its blank line', () => {
  assert.match(
    html('x[^1]\n\n[^1]: ```=latex\n    \\x\n    ```\n'),
    /<li id="fn1">\n\n {6}<p>/,
  )
})
