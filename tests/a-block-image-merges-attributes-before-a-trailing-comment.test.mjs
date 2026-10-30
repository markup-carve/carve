import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a trailing comment does not hide the inline attributes a block image merges', () => {
  assert.equal(renderDoc(parse('{.c}\n![a](x.png){.d}{%%}')), '<img src="x.png" alt="a" class="c d">')
  assert.equal(renderDoc(parse('{.c}\n![a](x.png){.d}{% a{.e} %}{%%}')), '<img src="x.png" alt="a" class="c d">')
  assert.equal(renderDoc(parse('{.c}\n![a][r]{.d}{%%}\n\n[r]: x.png')), '<img src="x.png" alt="a" class="c d">')
})
