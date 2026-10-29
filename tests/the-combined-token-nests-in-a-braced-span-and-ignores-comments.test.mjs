/*
 * PART 9 §9 THE COMBINED TOKEN and COMMENTS (carve#4041, carve#4042): a braced
 * span of either kind does not block a combined opener (carve#2903), and a
 * comment inside a `/*` ... `*\/` shape is invisible to pairing.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a combined token forms inside a braced span of either of its kinds', () => {
  assert.equal(html('{*a /*b*/ c*}\n'), '<p><strong>a <strong><em>b</em></strong> c</strong></p>')
  assert.equal(html('{/a /*x*/ b/}\n'), '<p><em>a <strong><em>x</em></strong> b</em></p>')
})

test('a bare delimiter of the braced span\'s own kind stays text there', () => {
  assert.equal(html('{*a *b* c*}\n'), '<p><strong>a *b* c</strong></p>')
})

test('a comment inside a combined shape does not change its pairing', () => {
  assert.equal(html('/x /*a %% b*/ y\n'), html('/x /*a*/ y\n'))
  assert.equal(html('/x /*a %% b*/ y\n'), '<p><em>x /<strong>a</strong></em> y</p>')
})
