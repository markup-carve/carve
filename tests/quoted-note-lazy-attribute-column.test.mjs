import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a quoted note run uses an unprefixed lazy line written column (#5619)', () => {
  const render = (padding) => renderDoc(parse(`> [^a]: +\n> {#i\n${padding}.y}\n\nsee[^a]`))
  // The `{` is measured where it is written, source column 2 (carve#5820 ruling A).
  for (const padding of ['', ' ', '  ']) assert.match(render(padding), /<p>\{#i\n\.y\}/, padding)
  for (const padding of ['   ', '    ']) {
    const html = render(padding)
    assert.doesNotMatch(html, /\{#i|\.y\}/, padding)
    assert.match(html, /<li id="fn1">[\s\S]*role="doc-backlink"/, padding)
  }
})
