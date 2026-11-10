import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

// CARVE-P2-035: the `{` after a task box sits at its source column (carve#5766).
test('a comment run after a task box refuses a continuation at its opening brace', () => {
  assert.equal(html('- [ ] {% a\n      b\n      z %} y'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="{% a b z %} y"> {% a\nb\nz %} y</li>\n</ul>')
  assert.equal(html('- [ ] {% a\n       b\n       z %} y'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="y">  y</li>\n</ul>')
  assert.equal(html('- [x]  {% a\n       z %} y'),
    '<ul class="task-list">\n  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="{% a z %} y"> {% a\nz %} y</li>\n</ul>')
  assert.equal(html('> - [ ] {% a\n>       z %} y'),
    '<blockquote>\n  <ul class="task-list">\n    <li><input type="checkbox" disabled aria-label="{% a z %} y"> {% a\nz %} y</li>\n  </ul>\n</blockquote>')
})

test('an attribute run after a task box refuses a continuation at its opening brace', () => {
  assert.equal(html('- [ ] {.x\n      .y}\nz'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="{.x .y} z"> {.x\n.y}\nz</li>\n</ul>')
  assert.equal(html('- [ ] {.x\n       .y}\n  p'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="p"> <p class="x y">p</p></li>\n</ul>')
})

test('a first-block plus after a task box measures the attached run from its own line', () => {
  assert.equal(html('- [ ] +\n{% a\n z %} y'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="y">  y</li>\n</ul>')
})
