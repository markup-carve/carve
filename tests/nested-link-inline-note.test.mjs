import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('nested link text unwraps around an inline note', () => {
  const output = renderDoc(parse('[[ ^[b]]()]()')).trim()
  assert.match(output, /^<p><a href=""> <sup id="fnref1">1<\/sup><\/a><\/p>/)
  assert.doesNotMatch(output, /<a href=""><a /)
  assert.match(output, /<p>b<a href="#fnref1" role="doc-backlink"/)
})

test('authored private-use characters are never mistaken for a note placeholder', () => {
  const literal = '\uE0020\uE003'
  assert.equal(renderDoc(parse(`[${literal}]()`)).trim(), `<p><a href="">${literal}</a></p>`)
  const output = renderDoc(parse(`[[${literal} ^[b]]()]()`)).trim()
  assert.match(output, new RegExp(`^<p><a href="">${literal} <sup id="fnref1">1<\\/sup><\\/a><\\/p>`))
  assert.equal([...output.matchAll(/id="fnref\d+"/g)].length, 1)
})
