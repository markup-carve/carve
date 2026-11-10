import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('a marker-line comment keeps its authored continuation columns', () => {
  assert.equal(html('- {% a\n   {lang=de}\n   z %} y'), '<ul>\n  <li> y</li>\n</ul>')
  assert.equal(html('1. {% a\n    {#id}\n    z %} y'), '<ol>\n  <li> y</li>\n</ol>')
  assert.equal(html('> - {% a\n>    {.x}\n>    z %} y'), '<blockquote>\n  <ul>\n    <li> y</li>\n  </ul>\n</blockquote>')
})

test('a body-line comment keeps its authored continuation columns', () => {
  assert.equal(html('- p\n  {% a\n   {lang=de}\n   z %} y'), '<ul>\n  <li>p\n y</li>\n</ul>')
})

test('a continuation at the opening brace still refuses the run', () => {
  for (const source of ['- {% a\n  {lang=de}\n   z %} y', '- - {% a\n    {x}\n     z %} y'])
    assert.equal(html(source), html(source.replace('{', '\\{')))
})

test('notes and descriptions compare against their marker-line comment column', () => {
  const note = (indent) => html(`[^n]: {% a\n${' '.repeat(indent)}{x}\n${' '.repeat(indent)}z %} y\n\nsee[^n]`)
  assert.equal(note(2), html('[^n]: \\{% a\n  {x}\n  z %} y\n\nsee[^n]'))
  assert.ok(note(3).includes('<p> y<a href="#fnref1"'))
  assert.equal(html(':: t\n: {% a\n  {x}\n  z %} y'), html(':: t\n: \\{% a\n  {x}\n  z %} y'))
  assert.equal(html(':: t\n: {% a\n   {x}\n   z %} y'), '<dl>\n  <dt>t</dt>\n  <dd> y</dd>\n</dl>')
  assert.equal(html('- [^n]: {% a\n    {x}\n     z %} y\n\nsee[^n]'),
    html('- [^n]: \\{% a\n    {x}\n     z %} y\n\nsee[^n]'))
})

test('a first-block plus resets the item comment-column history', () => {
  assert.equal(html('- +\n{% a\n x %} y'), '<ul>\n  <li> y</li>\n</ul>')
  assert.equal(html('- p\n+\n{% a\n x %} y'), '<ul>\n  <li>p\n     y\n  </li>\n</ul>')
})
