import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a description marker below a first-block item folds into its paragraph (carve#4080)', () => {
  assert.equal(html('- +\n  x\n: `\n'), '<ul>\n  <li>x\n: <code></code></li>\n</ul>')
})

test('an attribute line below a first-block item closes it (carve#4080)', () => {
  assert.equal(html('- +\n  x\n{e}\n`\n'), '<ul>\n  <li>x</li>\n</ul>\n<p e=""><code></code></p>')
})

test('plain lazy text still folds after a first-block item', () => {
  assert.equal(html('- +\n  x\ny\n'), '<ul>\n  <li>x\ny</li>\n</ul>')
})

test('a description marker folds into a first-block sublist\'s paragraph (carve#4080)', () => {
  assert.equal(html('- a\n  - +\n    - y\n: y\n'),
    '<ul>\n  <li>a\n    <ul>\n      <li>\n        <ul>\n          <li>y\n: y</li>\n        </ul>\n      </li>\n    </ul>\n  </li>\n</ul>')
})
