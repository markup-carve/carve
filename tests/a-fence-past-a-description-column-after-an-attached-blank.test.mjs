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
