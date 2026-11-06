import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5309: an unclosed `+` attached fence ends at its blank (PART 9 §17 L3)
// at any item depth, so the paragraph after it takes a lazy line (PART 0 S4).
const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

test('the reported document folds `tail` into `z`', () => {
  assert.equal(html('- - - +\n    ```\n\n    z\ntail\n'),
    '<ul><li><ul><li><ul><li><pre><code></code></pre></li></ul><p>z\ntail</p></li></ul></li></ul>')
})

test('four levels and a tilde fence fold it too', () => {
  assert.match(html('- - - - +\n      ```\n\n      z\ntail\n'), /<p>z\ntail<\/p>/)
  assert.match(html('- - - +\n    ~~~\n\n    z\ntail\n'), /<p>z\ntail<\/p>/)
})

test('a closed fence reads the same', () => {
  assert.match(html('- - - +\n    ```\n    ```\n\n    z\ntail\n'), /<p>z\ntail<\/p>/)
})
