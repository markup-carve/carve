import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('a task label drops an unresolved note reference, as a heading id does (CARVE-P2-004)', () => {
  assert.equal(html('- [x] a[^f]\n'),
    '<ul class="task-list">\n  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="a"> a[^f]</li>\n</ul>')
  assert.equal(html('- [ ] read [^missing] now'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="read now"> read [^missing] now</li>\n</ul>')
  assert.equal(html('- [ ] a[^f]{.k}\n'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="a"> a[^f]{.k}</li>\n</ul>')
  assert.match(html('# a[^f]\n'), /<section id="a">/)
})

test('a resolved note reference still contributes no derived text to a task label', () => {
  const output = html('- [ ] read [^m] now\n\n[^m]: note')
  assert.match(output, /<input type="checkbox" disabled aria-label="read now"> read <a id="fnref1"/)
})
