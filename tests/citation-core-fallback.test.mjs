import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('citation-shaped core lines remain paragraph text', () => {
  assert.equal(html('[@a]'), '<p>[<span class="mention"><strong>@a</strong></span>]</p>')
  assert.equal(html('[@x]:'), '<p>[<span class="mention"><strong>@x</strong></span>]:</p>')
  assert.equal(html('[@key]: entry'), '<p>[<span class="mention"><strong>@key</strong></span>]: entry</p>')
  assert.equal(html('before\n[@a]\nafter'), '<p>before\n[<span class="mention"><strong>@a</strong></span>]\nafter</p>')
})
