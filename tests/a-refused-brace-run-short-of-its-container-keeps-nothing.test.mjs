/*
 * The CARVE-P2-035 kept line belongs to a run that stands in its container. A
 * run short of the container keeps nothing, and a follower short of it is read
 * as usual (PART 0 S4, carve#5200).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (lines) => renderDoc(parse(lines.join('\n') + '\n')).trim()

test('a run below a closed item applies its attributes to the fence after it', () => {
  assert.equal(render(['- :: term', ' {.k', ' #x}', '  ```', '  code', '  ```', 'next']), [
    '<ul>',
    '  <li>',
    '    <dl>',
    '      <dt>term</dt>',
    '    </dl>',
    '  </li>',
    '</ul>',
    '<pre class="k" id="x"><code>code',
    '</code></pre>',
    '<p>next</p>',
  ].join('\n'))
})

for (const indent of ['', ' ']) {
  test(`a quote at column ${indent.length} after a lazy refused run ends the item`, () => {
    assert.equal(render(['- a', '{x', 'y}', indent + '> c']), [
      '<ul>',
      '  <li>a',
      '{x',
      'y}</li>',
      '</ul>',
      '<blockquote><p>c</p></blockquote>',
    ].join('\n'))
  })
}

test('a heading short of the item after a refused run in it ends the item', () => {
  assert.equal(render(['- a', '  {x', '  y}', ' # c']), [
    '<ul>',
    '  <li>a',
    '{x',
    'y}</li>',
    '</ul>',
    '<section id="c">',
    '  <h1>c</h1>',
    '</section>',
  ].join('\n'))
})

test('a run and follower in the item still keep the follower', () => {
  assert.equal(render(['- a', '  {x', '  y}', '  # c', 'more']), [
    '<ul>',
    '  <li>a',
    '{x',
    'y}',
    '# c',
    'more</li>',
    '</ul>',
  ].join('\n'))
})

test('a follower short of a nested item ends the keeping', () => {
  assert.equal(render(['- p', '  - a', '    {x', '    y}', '   # c', 'more']), [
    '<ul>',
    '  <li>p',
    '    <ul>',
    '      <li>a',
    '{x',
    'y}</li>',
    '    </ul>',
    '    <h1 id="c">c</h1>',
    '  </li>',
    '</ul>',
    '<p>more</p>',
  ].join('\n'))
})

test('a follower short of an item in a quote ends the keeping', () => {
  assert.equal(render(['> - a', '>   {x', '>   y}', '>  # c', 'more']), [
    '<blockquote>',
    '  <ul>',
    '    <li>a',
    '{x',
    'y}</li>',
    '  </ul>',
    '  <h1 id="c">c</h1>',
    '</blockquote>',
    '<p>more</p>',
  ].join('\n'))
})

test('a run folded lazily into a nested item keeps nothing', () => {
  assert.equal(render(['- p', '  - a', '   {x', '   y}', '    # c', 'more']), [
    '<ul>',
    '  <li>p',
    '    <ul>',
    '      <li>a',
    '{x',
    'y}',
    '        <h1 id="c">c</h1>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
    '<p>more</p>',
  ].join('\n'))
})

test('a run folded lazily into an item in a quote keeps nothing', () => {
  assert.equal(render(['> - a', '>  {x', '>  y}', '>  # c', 'more']), [
    '<blockquote>',
    '  <ul>',
    '    <li>a',
    '{x',
    'y}</li>',
    '  </ul>',
    '  <h1 id="c">c</h1>',
    '</blockquote>',
    '<p>more</p>',
  ].join('\n'))
})

test('a run folded lazily into a quote in an item keeps nothing', () => {
  assert.equal(render(['- > a', '  {x', '  y}', '  > # c', 'more']), [
    '<ul>',
    '  <li>',
    '    <blockquote>',
    '      <p>a',
    '{x',
    'y}</p>',
    '      <h1 id="c">c</h1>',
    '    </blockquote>',
    '  </li>',
    '</ul>',
    '<p>more</p>',
  ].join('\n'))
})

test('a run folded lazily into a nested quote keeps nothing', () => {
  assert.equal(render(['> > a', '> {x', '> y}', '> > # c', 'more']), [
    '<blockquote>',
    '  <blockquote>',
    '    <p>a',
    '{x',
    'y}</p>',
    '    <h1 id="c">c</h1>',
    '  </blockquote>',
    '</blockquote>',
    '<p>more</p>',
  ].join('\n'))
})

test('a run folded lazily into a description keeps nothing', () => {
  assert.equal(render([':: t', ': a', '{x', 'y}', '  # c', 'more']), [
    '<dl>',
    '  <dt>t</dt>',
    '  <dd>',
    '    <p>a',
    '{x',
    'y}</p>',
    '    <h1 id="c">c</h1>',
    '  </dd>',
    '</dl>',
    '<p>more</p>',
  ].join('\n'))
})
