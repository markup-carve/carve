import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('structural URLs win across inline and resolved reference forms', () => {
  for (const source of [
    '[a](/u){HREF=/v}',
    '[a]: /u {href=/v}\n\n[a][]',
    '<https://u.test>{href=/v}',
  ]) {
    const result = html(source)
    assert.equal((result.match(/ href=/g) ?? []).length, 1, source)
    assert.match(result, /href="(?:\/u|https:\/\/u\.test)"/, source)
  }
  const image = html('[a]: /u {src=/v}\n\n![a][]')
  assert.equal((image.match(/ src=/g) ?? []).length, 1)
  assert.match(image, /src="\/u"/)
})

test('nested references keep unresolved source and flatten resolved links', () => {
  assert.equal(html('[[x][]]()'), '<p><a href="">[x][]</a></p>')
  assert.equal(html('[x]: /u\n\n[[x][]]()'), '<p><a href="">x</a></p>')
})

test('invalid table partition keeps authored header cells in one body', () => {
  const result = html('{header-rows=3 footer-rows=1}\n|= a | b |')
  assert.match(result, /<tbody>/)
  assert.match(result, /<th scope="row">a<\/th>/)
  assert.doesNotMatch(result, /<thead>|<tfoot>/)
})
