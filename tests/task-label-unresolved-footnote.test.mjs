import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('a task label keeps an unresolved note reference that is visible in its paragraph', () => {
  assert.equal(html('- [ ] {.x\n      .y}\n[^m]: n'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="{.x .y} [^m]: n"> {.x\n.y}\n[^m]: n</li>\n</ul>')
  assert.equal(html('- [ ] read [^missing] now'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="read [^missing] now"> read [^missing] now</li>\n</ul>')
})

test('a resolved note reference still contributes no derived text to a task label', () => {
  const output = html('- [ ] read [^m] now\n\n[^m]: note')
  assert.match(output, /<input type="checkbox" disabled aria-label="read now"> read <a id="fnref1"/)
})
