import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// carve#5756: a brace line inside an item's open inline span keeps the run's columns (CARVE-P2-035).
test('a brace line inside an open item comment continues the run past its opener', () => {
  for (const brace of ['{lang=de}', '{.x}', '{#i}']) {
    assert.equal(html(`- {% a\n   ${brace}\n   z %} y\n`), '<ul>\n  <li> y</li>\n</ul>', brace)
    assert.equal(html(`1. {% a\n    ${brace}\n    z %} y\n`), '<ol>\n  <li> y</li>\n</ol>', brace)
    assert.equal(html(`- p\n  {% a\n   ${brace}\n   z %} y\n`), '<ul>\n  <li>p\n y</li>\n</ul>', brace)
  }
})

test('the same brace line still refuses a run it does not pass', () => {
  assert.equal(html('- {% a\n   {lang=de}\n  z %} y\n'), '<ul>\n  <li>{% a\n{lang=de}\nz %} y</li>\n</ul>')
})

test('a brace line inside an open item code span is paragraph text', () => {
  assert.equal(html('- `a\n   {lang=de}\n   z` y\n'), '<ul>\n  <li><code>a\n{lang=de}\nz</code> y</li>\n</ul>')
})

test('a brace line outside any open span still sets its own attributes', () => {
  assert.equal(html('- {% a %} p\n   {lang=de}\n   z\n'), html('- {% a %} p\n  {lang=de}\n  z\n'))
})
