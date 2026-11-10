import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('a later description cannot close an earlier comment run', () => {
  const first = ':: t\n:   {% a\n     {k=v}\n: next\n'
  const expected = '<dl>\n  <dt>t</dt>\n  <dd>{% a\n{k=v}</dd>\n  <dd>next</dd>\n</dl>'
  assert.equal(html(first), expected)
  assert.equal(html(first + 'z %} y\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>{% a\n{k=v}</dd>\n  <dd>next\nz %} y</dd>\n</dl>')
})

test('a closer inside the description still completes its comment run', () => {
  assert.equal(html(':: t\n:   {% a\n     {k=v}\n     z %} y\n: next\n'),
    '<dl>\n  <dt>t</dt>\n  <dd> y</dd>\n  <dd>next</dd>\n</dl>')
})

test('a quoted description observes the same sibling boundary', () => {
  assert.equal(html('> :: t\n> :   {% a\n>      {k=v}\n> : next\n> z %} y\n'),
    '<blockquote>\n  <dl>\n    <dt>t</dt>\n    <dd>{% a\n{k=v}</dd>\n    <dd>next\nz %} y</dd>\n  </dl>\n</blockquote>')
})

test('ordinary block openers still interrupt an unclosed description comment', () => {
  assert.equal(html(':: t\n:   {% a\n     # Heading\n: next\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>{% a</p>\n    <h1 id="Heading">Heading</h1>\n  </dd>\n  <dd>next</dd>\n</dl>')
  assert.equal(html(':: t\n:   {% a\n     ```\n     code\n     ```\n: next\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>{% a</p>\n    <pre><code>code\n</code></pre>\n  </dd>\n  <dd>next</dd>\n</dl>')
  assert.equal(html(':: t\n:   {% a\n     {k=v}\n     # Heading\n: next\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>{% a\n{k=v}</p>\n    <h1 id="Heading">Heading</h1>\n  </dd>\n  <dd>next</dd>\n</dl>')
})
