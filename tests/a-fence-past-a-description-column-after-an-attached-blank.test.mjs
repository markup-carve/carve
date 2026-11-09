import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const run of ['```', '~~~']) {
  for (const column of [2, 3, 4]) {
    test(`a ${run} fence at description column ${column} opens after the attached fence ends`, () => {
      const source = [':: t', ': +', run, 'a', '', ' '.repeat(column) + run, 'zz'].join('\n')
      assert.equal(renderDoc(parse(source)), [
        '<dl>',
        '  <dt>t</dt>',
        '  <dd>',
        '    <pre><code>a\n</code></pre>',
        '    <pre><code></code></pre>',
        '  </dd>',
        '</dl>',
        '<p>zz</p>',
      ].join('\n'))
    })
  }
}

test('a fence in a later description list item keeps its item indentation', () => {
  const source = [':: t', ': +', '```', 'a', '', '  - item', '    ```', '    x', '    ```'].join('\n')
  assert.equal(renderDoc(parse(source)), [
    '<dl>',
    '  <dt>t</dt>',
    '  <dd>',
    '    <pre><code>a\n</code></pre>',
    '    <ul>',
    '      <li>item',
    '        <pre><code>x\n</code></pre>',
    '      </li>',
    '    </ul>',
    '  </dd>',
    '</dl>',
  ].join('\n'))
})

test('a fence-shaped line in a later line block keeps its payload indentation', () => {
  const source = [':: t', ': +', '```', 'a', '', '  ::: |', '  a', '   ```', '  b', '  :::'].join('\n')
  const out = renderDoc(parse(source))
  assert.match(out, /<div class="line-block">/)
  assert.match(out, /&nbsp;<code>\nb<\/code><\/p>/)
})
