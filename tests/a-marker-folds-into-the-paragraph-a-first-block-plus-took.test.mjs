import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4235, carve#4396: list markers never interrupt (§10 I2), whether a `+`
// took the paragraph above or was refused into it.
const html = (source) => renderDoc(parse(source))

test('a marker between the columns folds into the paragraph a first-block + took', () => {
  for (const marker of ['*', '1.', '2)', 'a.', 'i)', '9.']) {
    assert.equal(html(`- +\n  b\n ${marker} w1\n`), html(`- b\n ${marker} w1\n`))
  }
  assert.equal(html('- +\n  b\n * w1\n'), '<ul>\n  <li>b\n* w1</li>\n</ul>')
  assert.equal(html('- +\n  b\n * w1\n  c\n'), '<ul>\n  <li>b\n* w1\nc</li>\n</ul>')
})

test('a column-zero or nested paragraph the + took folds the marker too', () => {
  assert.equal(html('1. +\n+ w1\n - w2\n'), '<ol>\n  <li>+ w1\n- w2</li>\n</ol>')
  assert.equal(html('- a\n  - +\n  + w1\n   9. w2\n'), '<ul>\n  <li>a\n    <ul>\n      <li>+ w1\n9. w2</li>\n    </ul>\n  </li>\n</ul>')
})

test('a sibling marker and a sublist at the content column keep their reading', () => {
  assert.equal(html('- +\n  b\n- c\n'), '<ul>\n  <li>b</li>\n  <li>c</li>\n</ul>')
  assert.equal(html('- +\n  b\n  * c\n'), '<ul>\n  <li>b\n    <ul>\n      <li>c</li>\n    </ul>\n  </li>\n</ul>')
})
