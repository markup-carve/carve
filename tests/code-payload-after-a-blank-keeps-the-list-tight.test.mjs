// carve#4903: §17 L1c's look-back skips invisible lines, and a comment- or
// definition-shaped line in a code body is payload, so it is not one.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (lines) => renderDoc(parse(lines.join('\n') + '\n'))

test('a %%% line in a nested code body is payload, so the list stays tight', () => {
  assert.equal(render([
    '- a',
    '  - ```',
    '    x',
    '',
    '    %%%',
    '    ```',
    '    %%%',
    '- sub',
  ]), [
    '<ul>',
    '  <li>a',
    '    <ul>',
    '      <li>',
    '        <pre><code>x',
    '',
    '%%%',
    '</code></pre>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '  <li>sub</li>',
    '</ul>',
  ].join('\n'))
})

test('a definition in an unterminated description fence is payload, like a comment there', () => {
  for (const payload of ['[r]: /u', '%% c']) {
    assert.equal(render([
      '- :: term',
      '  : ```',
      '    x',
      '',
      `    ${payload}`,
      '- sub',
    ]), [
      '<ul>',
      '  <li>',
      '    <dl>',
      '      <dt>term</dt>',
      '      <dd>',
      '        <pre><code>x',
      '',
      payload,
      '</code></pre>',
      '      </dd>',
      '    </dl>',
      '  </li>',
      '  <li>sub</li>',
      '</ul>',
    ].join('\n'))
  }
})

test('invisible lines after a closed code body still loosen the list', () => {
  assert.match(render([
    '- a',
    '  - ```',
    '    x',
    '    ```',
    '',
    '    %%%',
    '    c',
    '    %%%',
    '- sub',
  ]), /<li><p>sub<\/p><\/li>/)
})
