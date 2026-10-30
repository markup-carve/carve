/*
 * PART 9 §17 L3 bounds a first-block `+` attachment at one block. In a list
 * item a fence attached below the content column leaves the blank after it to
 * the host (carve#4048), and a descendant's attached fence runs through its
 * closer past a blank. A task box's columns fold into the marker-line child's
 * paragraph after a lazy line too (carve#4038, CARVE-P0-008, PART 0 S4).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the blank after a column-0 fence a + attached is not payload', () => {
  const expected = '<ul>\n  <li>\n    <pre><code>x\n</code></pre>\n  </li>\n</ul>\n<p>see</p>'
  assert.equal(html('- +\n```\nx\n\nsee\n'), expected)
  assert.equal(html('- a\n+\n```\nx\n\nsee\n'), expected.replace('<li>\n', '<li>a\n'))
})

test('a column-0 fence with a closer keeps the blank inside', () => {
  assert.equal(html('- +\n```\nx\n\n```\n'), '<ul>\n  <li>\n    <pre><code>x\n\n</code></pre>\n  </li>\n</ul>')
})

test("a descendant's attached fence runs through its closer past a blank", () => {
  assert.equal(html('- foo\n  1. +\n  ```\n  x\n\n  ```\n'),
    '<ul>\n  <li>foo\n    <ol>\n      <li>\n        <pre><code>x\n\n</code></pre>\n      </li>\n    </ol>\n  </li>\n</ul>')
})

test("a marker in a task box's columns folds after a lazy line", () => {
  const out = html('- [ ] - [ ] a\n        - [x] - c\n      c\n    * [ ] c\n')
  assert.match(out, /<li>c\nc\n\* \[ \] c<\/li>/)
  assert.equal((out.match(/<ul/g) ?? []).length, 4)
})
