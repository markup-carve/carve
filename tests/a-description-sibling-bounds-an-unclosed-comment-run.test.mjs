import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()
const oracle = source => html(source.replace('{', '\\{'))

for (const source of [
  ':: t\n:   {% a\n     {k=v}\n: next\n',
  ':: t\n:   {% a\n     {k=v}\n: next\nz %} y\n',
  '> :: t\n> :   {% a\n>      {k=v}\n> : next\n> z %} y\n',
  ':: t\n:   {% a\n     # Heading\n: next\n',
  ':: t\n:   {% a\n     ```\n     code\n     ```\n: next\n',
  ':: t\n:   {% a\n     {k=v}\n     # Heading\n: next\n',
]) test('later lines follow ordinary description ownership after a refused opener', () => {
  assert.equal(html(source), oracle(source))
})

test('a fully prefixed closer inside the description completes its comment run', () => {
  assert.equal(html(':: t\n:   {% a\n     {k=v}\n     z %} y\n: next\n'),
    '<dl>\n  <dt>t</dt>\n  <dd> y</dd>\n  <dd>next</dd>\n</dl>')
})
