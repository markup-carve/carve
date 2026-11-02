/*
 * A list marker under a list item never attaches (carve#4409): the `+` stays a
 * letter and a marker at the content column opens a sublist. A later flush-left
 * block closes the item, a lazy line folds into the sublist's paragraph (#4013).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

test('a block after the sublist closes the item', () => {
  assert.equal(html('- +\n  * x\n# T\n'), '<ul><li>+ <ul><li>x</li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('- +\n  * - *\n# T\n'), '<ul><li>+ <ul><li><ul><li>*</li></ul></li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('- o\n  - +\n    * x\n# T\n'), '<ul><li>o <ul><li>+ <ul><li>x</li></ul></li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('- o\n  - [ ] +\n        * x\n# T\n'),
    '<ul><li>o <ul class="task-list"><li><input type="checkbox" disabled aria-label="+"> + <ul><li>x</li></ul></li></ul></li></ul><section id="T"><h1>T</h1></section>')
  assert.equal(html('> - +\n>   * x\n> # T\n'), '<blockquote><ul><li>+ <ul><li>x</li></ul></li></ul><h1 id="T">T</h1></blockquote>')
})

test('a marker at the marker column is a sibling and leaves the + a letter', () => {
  assert.equal(html('- +\n- x\n# T\n'), '<ul><li>+</li><li>x</li></ul><section id="T"><h1>T</h1></section>')
})

test('a block at the item content column stays in the item, outside the sublist', () => {
  assert.equal(html('- +\n  * x\n  # T\n'), '<ul><li>+ <ul><li>x</li></ul><h1 id="T">T</h1></li></ul>')
})

test('a lazy line still folds into the sublist', () => {
  assert.equal(html('- +\n  * x\ntail\n'), '<ul><li>+ <ul><li>x tail</li></ul></li></ul>')
  assert.equal(html('> - +\n>   * - *\n> tail\n'), '<blockquote><ul><li>+ <ul><li><ul><li>* tail</li></ul></li></ul></li></ul></blockquote>')
  assert.equal(html('- o\n  - +\n    * x\ntail\n'), '<ul><li>o <ul><li>+ <ul><li>x tail</li></ul></li></ul></li></ul>')
  // A valid fence interrupts and leaves the list (carve#4018); an invalid one folds.
  assert.equal(html('- o\n  - +\n    * x\n```\n'), '<ul><li>o <ul><li>+ <ul><li>x</li></ul></li></ul></li></ul><pre><code></code></pre>')
  assert.equal(html('- o\n  - +\n    * x\n```js,title="x"\n'), '<ul><li>o <ul><li>+ <ul><li>x <code>js,title="x"</code></li></ul></li></ul></li></ul>')
})
