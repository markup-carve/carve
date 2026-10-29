import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a block glued to a combined closer inside a braced emphasis span attaches', () => {
  assert.equal(html('{/a /*b*/{.k} c/}\n'), '<p><em>a <strong class="k"><em>b</em></strong> c</em></p>')
  assert.equal(html('{/a /*b*/{.k}{#i}/}\n'), '<p><em>a <strong class="k" id="i"><em>b</em></strong></em></p>')
})

test('a delimiter in an attached block does not pair outside it', () => {
  assert.equal(html('{/a /*b*/{k=_v} c_/}\n'), '<p><em>a <strong k="_v"><em>b</em></strong> c_</em></p>')
})

test('the block cannot reach past the braced span closer', () => {
  assert.equal(html('{/a /*b*/{x="/}"} c/}\n'), '<p><em>a <strong><em>b</em></strong>{x=“</em>”} c/}</p>')
})
