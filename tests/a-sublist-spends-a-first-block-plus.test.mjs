/*
 * A first-block `+` attaches ONE block (PART 9 §17 L3). A sublist at the
 * content column is that block, so a later flush-left block closes the item,
 * while a lazy line still folds into the sublist's open paragraph (#4013).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

test('a block after the sublist closes the item', () => {
  assert.equal(html('- +\n  * x\n# T\n'), '<ul><li><ul><li>x</li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('- +\n  * * *\n# T\n'), '<ul><li><ul><li><ul><li>*</li></ul></li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('- o\n  - +\n    * x\n# T\n'), '<ul><li>o <ul><li><ul><li>x</li></ul></li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('- o\n  - [ ] +\n        * x\n# T\n'),
    '<ul><li>o <ul class="task-list"><li><input type="checkbox" disabled><ul><li>x</li></ul></li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('> - +\n>   * x\n> # T\n'), '<blockquote><ul><li><ul><li>x</li></ul></li></ul><h1 id="T">T</h1></blockquote>')
})

test('a block at the item content column stays in the item, outside the sublist', () => {
  assert.equal(html('- +\n  * x\n  # T\n'), '<ul><li><ul><li>x</li></ul><h1 id="T">T</h1></li></ul>')
})

test('a lazy line still folds into the sublist', () => {
  assert.equal(html('- +\n  * x\ntail\n'), '<ul><li><ul><li>x tail</li></ul></li></ul>')
  assert.equal(html('> - +\n>   * * *\n> tail\n'), '<blockquote><ul><li><ul><li><ul><li>* tail</li></ul></li></ul></li></ul></blockquote>')
  assert.equal(html('- o\n  - +\n    * x\ntail\n'), '<ul><li>o <ul><li><ul><li>x tail</li></ul></li></ul></li></ul>')
  assert.equal(html('- o\n  - +\n    * x\n```\n'), '<ul><li>o <ul><li><ul><li>x <code></code></li></ul></li></ul></li></ul>')
})
