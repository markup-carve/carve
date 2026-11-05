import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a termless description marker below its body column folds into the open paragraph', () => {
  assert.equal(renderDoc(parse('- x\n\n  :: t\n  : +\n  r\n : b\n')),
    '<ul>\n  <li><p>x</p>\n    <dl>\n      <dt>t</dt>\n      <dd>r\n: b</dd>\n    </dl>\n  </li>\n</ul>')
})
