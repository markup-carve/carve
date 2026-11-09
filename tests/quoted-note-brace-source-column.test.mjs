import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a quoted note keeps the authored column of a lazy brace continuation', () => {
  const output = html('> [^a]: +\n> {#i\n .y}\n\nsee[^a]\n')
  assert.match(output, /<p>\{<span class="tag"><strong>#i<\/strong><\/span>\n\.y\}<a href="#fnref1"/)
})

test('a continuation at the brace column still refuses the run', () => {
  const output = html('> [^a]: +\n> {#i\n.y}\n\nsee[^a]\n')
  assert.match(output, /<p>\{#i\n\.y\}<a href="#fnref1"/)
})
