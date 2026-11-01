/*
 * A list marker at a task item's content column opens a list in that item
 * (PART 0 S3), so the marker-line child is over and its task-box columns
 * stop rebasing or folding later lines (#4011).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

const box = (label) => `<input type="checkbox" disabled${label ? ` aria-label="${label}"` : ''}>`

test('a line at the sibling task item content column nests in it', () => {
  assert.equal(html('- [ ] - b\n  - [ ] c\n    - [ ] d\n'),
    `<ul class="task-list"><li>${box()}<ul><li>b</li></ul><ul class="task-list"><li>${box('c')} c ` +
    `<ul class="task-list"><li>${box('d')} d</li></ul></li></ul></li></ul>`)
  assert.equal(html('- [ ] - a\n  - [ ] - b\n    - [ ] c\n      - [ ] d\n'),
    `<ul class="task-list"><li>${box()}<ul><li>a</li></ul><ul class="task-list"><li>${box()}<ul><li>b</li></ul>` +
    `<ul class="task-list"><li>${box('c')} c <ul class="task-list"><li>${box('d')} d</li></ul></li></ul></li></ul></li></ul>`)
})

test('while the marker-line child is open, a box-column marker opens a new list', () => {
  assert.equal(html('- [x] - p\n    1. a\n'),
    '<ul class="task-list"><li data-task-state="x"><input type="checkbox" checked disabled><ul><li>p</li></ul><ol><li>a</li></ol></li></ul>')
})
