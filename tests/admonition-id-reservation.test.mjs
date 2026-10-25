import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const [name, source] of [
  ['explicit heading before admonition', '{#adm-1}\n# H\n\n::: warning "Careful"\nbody\n:::\n'],
  ['automatic heading after admonition', '::: warning "Careful"\nbody\n:::\n\n# adm-1\n'],
]) {
  test(name, () => {
    const html = renderDoc(parse(source))
    assert.match(html, /<section id="adm-1">/)
    assert.match(html, /aria-labelledby="adm-1-2"/)
    assert.match(html, /<p class="admonition-title" id="adm-1-2">/)
  })
}
