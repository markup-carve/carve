/*
 * Two readers in scripts/spec/layout.mjs spell `link_destination` by hand
 * instead of going through the Ohm grammar: the reference definition and the
 * captionable-image test. Both now ask the grammar, so parentheses balance,
 * the three destination escapes resolve, and a `)` in a title or a quoted `}`
 * in a block no longer ends the image early (carve#2122). No corpus document
 * reaches these shapes.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const resolved = (def) => html(`${def}\n\n[x][a]\n`)

test('an unbalanced parenthesis leaves a definition line as prose', () => {
  assert.equal(resolved('[a]: a(b'), '<p>[a]: a(b</p>\n<p>[x][a]</p>')
  assert.equal(resolved('[a]: a)b'), '<p>[a]: a)b</p>\n<p>[x][a]</p>')
})

test('a definition destination balances and unescapes like an inline one', () => {
  assert.equal(resolved('[a]: a(b)c'), '<p><a href="a(b)c">x</a></p>')
  assert.equal(resolved('[a]: a\\(b'), '<p><a href="a(b">x</a></p>')
  assert.equal(resolved('[a]: a\\\\b'), '<p><a href="a\\b">x</a></p>')
  assert.equal(resolved('[a]: a\\b'), '<p><a href="a\\b">x</a></p>')
})

const figure = (img) => `<figure>\n  ${img}\n  <figcaption>cap</figcaption>\n</figure>`

test('an image the grammar reads is captionable', () => {
  assert.equal(html('![a](/w/Foo_(bar))\n^ cap\n'), figure('<img src="/w/Foo_(bar)" alt="a">'))
  assert.equal(html("![a](/i 'T)')\n^ cap\n"), figure('<img src="/i" alt="a" title="T)">'))
  assert.equal(html('![a](/i){data-x="}"}\n^ cap\n'), figure('<img src="/i" alt="a" data-x="}">'))
})
