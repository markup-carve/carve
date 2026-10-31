import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('whitespace after a leading content tab stays content with the tab (carve#4610)', () => {
  assert.equal(html('- \t e\n'), '<ul>\n  <li>\t e</li>\n</ul>')
  assert.equal(html('- \t\te\n'), '<ul>\n  <li>\t\te</li>\n</ul>')
  assert.equal(html('- [ ] \t e\n'), '<ul class="task-list">\n  <li><input type="checkbox" disabled aria-label="e"> e</li>\n</ul>')
})

test('a marker after a leading content tab stays text', () => {
  assert.equal(html('- \t - x\n'), '<ul>\n  <li>\t - x</li>\n</ul>')
})
