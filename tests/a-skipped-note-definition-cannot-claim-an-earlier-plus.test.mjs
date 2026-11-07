import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a nested note marker cannot claim an earlier marker\'s visible follower', () => {
  const source = '[^a]: +\n[^a]: +\n- b\n\n[^a]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li id="fn1">\n      <ul>\n        <li>b<\/li>/)
})
