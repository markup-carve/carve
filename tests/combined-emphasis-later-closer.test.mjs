import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a combined opener pairs with a later nonempty closer', () => {
  assert.equal(html('/**/ /**/'), '<p><strong><em>*/ /*</em></strong></p>')
  assert.equal(html('/**/\n/**/'), '<p><strong><em>*/\n/*</em></strong></p>')
  assert.equal(html('/**/'), '<p><em>**</em></p>')
  assert.equal(html('/*x*/'), '<p><strong><em>x</em></strong></p>')
})
