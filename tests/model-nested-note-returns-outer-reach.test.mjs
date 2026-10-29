import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const endsList = (src) => assert.match(html(src), /<\/ul>\n<p>after/)

test('a closed fence in the marker-line note leaves nothing for a flush-left line (carve#4061)', () => {
  const src = '- [^a]: text\n    [^b]: text\n    ~~~\n    code\n    ~~~\nafter [^a] [^b]\n'
  assert.match(html(src), /^<ul>\n  <li><\/li>\n<\/ul>\n<p>after <a id="fnref1"/)
  assert.deepEqual(parse(src).footnoteDefs.get('a').map((b) => b.t), ['para', 'code'])
})

for (const [shape, src] of [
  ['after a blank', '- [^a]: text\n    [^b]: text\n\n    ~~~\n    code\n    ~~~\nafter\n'],
  ['after a third note', '- [^a]: text\n    [^b]: text\n    [^c]: t\n    ~~~\n    code\n    ~~~\nafter\n'],
  ['for a colon container', '- [^a]: text\n    [^b]: text\n    ::: n\n    x\n    :::\nafter\n'],
  ['for a note on its own line', '- x\n  [^a]: text\n    [^b]: text\n    ```\n    code\n    ```\nafter\n'],
]) {
  test(`the outer note keeps its body ${shape}`, () => endsList(src))
}

test('a lazy line still continues the nested note\'s open paragraph', () => {
  const src = '- [^a]: text\n    [^b]: text\nafter\n'
  assert.match(html(src), /^<ul>\n  <li><\/li>\n<\/ul>$/)
  assert.deepEqual(parse(src).footnoteDefs.get('b'), [{ t: 'para', lines: ['text', 'after'] }])
})
