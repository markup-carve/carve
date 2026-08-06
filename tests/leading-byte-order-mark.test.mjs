/*
 * A leading byte order mark is stripped before the first line is read.
 *
 * All three engines do it and none of them says so anywhere normative, so the
 * grammar now states it - and the executable spec did NOT do it, rendering
 * `<BOM># T` as a paragraph where every engine gives a heading (carve#872).
 *
 * This is a DIRECT test rather than a corpus pair, deliberately. A BOM'd corpus
 * document cannot land yet: all three engines strip the mark and then report
 * positions against the stripped string, so every offset comes back one
 * codepoint short and `tests/ast-positions.test.mjs` fails on it. That is
 * carve#876; pinning the oracle here keeps this fix from silently regressing
 * while the corpus case waits on it.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src))

test('a leading byte order mark does not turn a heading into a paragraph', () => {
  assert.equal(render('\uFEFF# T\n'), render('# T\n'))
})

test('exactly one mark is stripped, and only at the start', () => {
  // A second U+FEFF is ordinary content - PART 9 says a zero-width character
  // is not whitespace and is an ordinary character everywhere else - so the
  // heading marker no longer opens the line and it stays a paragraph.
  assert.notEqual(render('\uFEFF\uFEFF# T\n'), render('# T\n'))
})

test('a mark in the middle of a line is left alone', () => {
  // The boundary: stripping every U+FEFF would silently edit the author's text.
  assert.match(render('a\uFEFFb\n'), /a\uFEFFb/)
})

test('a document with no mark is unchanged', () => {
  // The control - a strip that ran unconditionally would eat the first
  // character of every document.
  assert.equal(render('# T\n'), '<section id="T">\n  <h1>T</h1>\n</section>')
})
