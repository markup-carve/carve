import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a lone brace remains content in every forced emphasis kind', () => {
  for (const [mark, tag] of [['/', 'em'], ['*', 'strong'], ['_', 'u'], ['~', 's'], ['^', 'sup'], [',', 'sub'], ['=', 'mark']]) {
    assert.equal(html(`{${mark}}${mark}}`), `<p><${tag}>}</${tag}></p>`, mark)
    assert.equal(html(`{${mark}${mark}}`), `<p>{${mark}${mark}}</p>`, `${mark} empty`)
  }
})
