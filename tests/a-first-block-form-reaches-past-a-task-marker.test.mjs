/*
 * The `+` first-block form opens an item's body past a TASK marker too.
 *
 * PART 9 §17 L4: a bare `+` as the item's marker-line content opens an item
 * whose body is the ONE flush-left block below it. The grammar spells the item
 * as `bullet_marker, [item_attributes], space, [task_marker], list_item_content`
 * and `first_block_content` is one of `list_item_content`'s alternatives, so
 * the form sits after the box - exactly where `- [x] > q`, `- [x] # h` and
 * `- [x] ---` open their blocks, because the box is a property of the ITEM and
 * nothing about its first block reaches it (carve#1381).
 *
 * The oracle excluded task lists from the form from the day it landed
 * (carve#246), with no rule behind the exclusion. So `- [x] +` read the `+` as
 * ITEM TEXT and named the box `aria-label="+"`, while carve-js c330d9a,
 * carve-php 684c0e30 and carve-rs c149919 all opened the form. Nothing in the
 * corpus pinned the seam, so the disagreement only ever surfaced from the
 * WRITER side (markup-carve/carve-js#1491). An EMPTY task item is now written
 * `- [x] {empty}`; `- [x] +` with no follower holds a literal `+` (carve#4409).
 *
 * The seam is pinned here rather than in the corpus because the corpus numbers
 * are append-only across concurrent spec branches; these rows gate on every PR
 * just the same.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

test('a bare + after a task marker opens the first-block form', () => {
  assert.equal(
    html('- [x] +\n| a | b |\n'),
    '<ul class="task-list"><li data-task-state="x"><input type="checkbox" checked disabled><table><tbody><tr><td>a</td><td>b</td></tr></tbody></table></li></ul>',
  )
})

test('the box still carries the state the author wrote', () => {
  assert.equal(
    html('- [ ] +\n> q\n'),
    '<ul class="task-list"><li><input type="checkbox" disabled><blockquote><p>q</p></blockquote></li></ul>',
  )
})

test('an empty task item is spelled with {empty}, and a bare + with no follower is its text', () => {
  // `- [x]` is an item whose TEXT is `[x]`, asserted below.
  assert.equal(html('-{#k} [x] {empty}\n'), '<ul class="task-list"><li data-task-state="x" id="k"><input type="checkbox" checked disabled></li></ul>')
  assert.equal(html('-{#k} [x] +\n'), '<ul class="task-list"><li data-task-state="x" id="k"><input type="checkbox" checked disabled aria-label="+"> +</li></ul>')
  assert.equal(html('-{#k} [x]\n'), '<ul><li id="k">[x]</li></ul>')
})

test('content after the + keeps the whole run as item text', () => {
  // The control. Only a BARE `+` triggers the form; widening it to any leading
  // `+` would swallow an author's literal plus, and the escape hatch below is
  // what a writer emits for one.
  assert.equal(
    html('- [x] + text\n'),
    '<ul class="task-list"><li data-task-state="x"><input type="checkbox" checked disabled aria-label="+ text"> + text</li></ul>',
  )
  assert.equal(html('- [x] \\+\n'), '<ul class="task-list"><li data-task-state="x"><input type="checkbox" checked disabled aria-label="+"> +</li></ul>')
})

test('the plain-bullet form is unchanged', () => {
  // The second control: the form the oracle already had must not have moved.
  assert.equal(
    html('- +\n| a | b |\n'),
    '<ul><li><table><tbody><tr><td>a</td><td>b</td></tr></tbody></table></li></ul>',
  )
  assert.equal(html('- {empty}\n'), '<ul><li></li></ul>')
  assert.equal(html('- +\n'), '<ul><li>+</li></ul>')
})
