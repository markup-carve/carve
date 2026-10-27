import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('URL sinks preserve inert bidi prefixes and blank DEL-split denied schemes', () => {
  const bidi = '\u202ejavascript:alert(1)'
  const denied = 'java\x7fscript:alert(1)'
  assert.equal(html(`[x](${bidi})`), `<p><a href="${bidi}">x</a></p>`)
  assert.equal(html(`![x](${denied})`), '<img src="" alt="x">')
  assert.equal(html(`[x][r]\n\n[r]: ${denied}`), '<p><a href="">x</a></p>')
  assert.equal(html(`[x](https://x){HREF="${bidi}"}`), `<p><a href="https://x" HREF="${bidi}">x</a></p>`)
})
