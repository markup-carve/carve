import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (body) => renderDoc(parse(`:: t\n: ${body}\n`))

for (const [name, body, tail] of [
  ['quote with indented attribute text', '> para\n    {#x}', 'tail'],
  ['ordered item with below-column attribute text', '1. para\n   {#x}', 'tail'],
  ['quote with an explicit second line', '> para\n  > more\n  >     {#x}', 'tail'],
  ['quote followed by an unclosed fence', '> para\n    {#x}', '```\nx'],
]) test(`${name} closes the nested paragraph and the next line leaves the description`, () => {
  const html = render(`${body}\n${tail}`)
  assert.doesNotMatch(html, /\{<span class="tag"><strong>#x<\/strong><\/span>\}/)
  assert.match(html, tail === 'tail' ? /<\/dl>\n<p>tail<\/p>/ : /<\/dl>\n<pre>/)
})

test('an attribute at the description body column closes the quote', () => {
  assert.match(render('> para\n{#x}\ntail'), /<\/dl>\n<p id="x">tail<\/p>/)
})

test('an attribute at an ordered item content column closes its paragraph', () => {
  assert.match(render('1. para\n     {#x}\ntail'), /<\/dl>\n<p>tail<\/p>/)
})
