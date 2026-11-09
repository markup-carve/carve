import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(`${source}\n`)).trim()

test('a cross-reference ID does not consume a forced span closer', () => {
  assert.equal(html('{^</#{^>^}'), '<p><sup>&lt;/#{^&gt;</sup></p>')
  assert.equal(html('{^a</#x^y>z^}'), '<p><sup>a&lt;/#x^y&gt;z</sup></p>')
  assert.equal(html('{^`</#x^}`^}z>'), '<p><sup><code>&lt;/#x^}</code></sup>z&gt;</p>')
  assert.match(html(`{^${'</#x'.repeat(200)}^}`), /^<p><sup>/)
  assert.equal(html('{#a </#x#}> b#'), '<p><span class="critic-comment">a &lt;/#x</span>&gt; b#</p>')
})
