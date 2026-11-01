/*
 * carve#4813, CARVE-P3-021: an opening `(`, `"` or `'` that follows whitespace or
 * the start of content counts as whitespace for the flag test.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a flag in parentheses or quotes keeps its run', () => {
  assert.equal(html('use (--force) or "--force" or [--force] or --force\n'), '<p>use (--force) or “--force” or [--force] or --force</p>')
  assert.equal(html("x '--y' z\n"), '<p>x ‘--y’ z</p>')
  assert.equal(html('(--x) y\n'), '<p>(--x) y</p>')
  assert.equal(html('a\n(--x)\n'), '<p>a\n(--x)</p>')
})

test('the start of a span or region is the start of content', () => {
  assert.equal(html('*(--x)*\n'), '<p><strong>(--x)</strong></p>')
  assert.equal(html('2{+(--x)+}\n'), '<p>2<ins>(--x)</ins></p>')
  assert.equal(html('[(--x)] y\n'), '<p>[(--x)] y</p>')
  assert.equal(html('[(--x)](u)\n'), '<p><a href="u">(--x)</a></p>')
})

test('an opener in any other position leaves the run converting', () => {
  assert.equal(html('range (1--10) and a(--x)\n'), '<p>range (1–10) and a(–x)</p>')
  assert.equal(html('((--x))\n'), '<p>((–x))</p>')
  assert.equal(html('("--x")\n'), '<p>(“–x”)</p>')
  assert.equal(html('2*(--x)\n'), '<p>2*(–x)</p>')
  assert.equal(html('(-- x)\n'), '<p>(– x)</p>')
  assert.equal(html('(--\n'), '<p>(–</p>')
})
