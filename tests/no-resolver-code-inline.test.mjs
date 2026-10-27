import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('an unresolved code include stays inline in a list item and a quote', () => {
  assert.equal(html('- {{ c @code }}'), '<ul>\n  <li>{{ c @code }}</li>\n</ul>')
  assert.equal(html('> {{ c @code }}'), '<blockquote><p>{{ c @code }}</p></blockquote>')
})

test('a standalone unresolved code include still ends its own paragraph', () => {
  assert.equal(html('{{ c @code }}\n^ cap'), '<p>{{ c @code }}</p>\n<p>^ cap</p>')
})
