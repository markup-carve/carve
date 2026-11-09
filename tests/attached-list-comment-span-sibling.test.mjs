import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a sibling ends the previous item comment span in a description-attached list', () => {
  const output = html(':: t\n: +\n- a\n  %%%\n- b\n  ```\n\n- c\n')
  assert.match(output, /<dd>\n    <ul>\n      <li><p>a<\/p><\/li>\n      <li><p>b<\/p>\n        <pre><code>\n<\/code><\/pre>\n      <\/li>\n      <li><p>c<\/p><\/li>\n    <\/ul>\n  <\/dd>/)
  assert.doesNotMatch(output, /<\/dl>\n<ul>/)
})

test('the same sibling rule applies in a note-attached list', () => {
  const output = html('see[^a]\n\n[^a]: +\n- a\n  %%%\n- b\n  ```\n\n- c\n')
  assert.match(output, /<li><p>c<\/p><\/li>/)
})
