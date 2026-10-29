// A line below a list item's content column ends a code fence that item holds,
// whether the fence follows a fenced sibling or a first-block `+` (carve#4080
// shapes 11 and 12). S4 folds a lazy line into a paragraph only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a fence item after a fenced sibling does not take a column-0 line', () => {
  assert.equal(html('- a\n  - ```\n  - ```\n`\n'), [
    '<ul>',
    '  <li>a',
    '    <ul>',
    '      <li>',
    '        <pre><code></code></pre>',
    '      </li>',
    '      <li>',
    '        <pre><code></code></pre>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
    '<p><code></code></p>',
  ].join('\n'))
})

test('a first-block fence in a task sub-item does not take a column-0 line', () => {
  assert.equal(html('- o\n  - [ ] +\n    ```\n`\n'), [
    '<ul>',
    '  <li>o',
    '    <ul class="task-list">',
    '      <li><input type="checkbox" disabled> ',
    '        <pre><code></code></pre>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
    '<p><code></code></p>',
  ].join('\n'))
})

test('a first-block fence keeps its content and its closer', () => {
  assert.equal(html('- +\n  ~~~\nx\n'), '<ul>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>x</p>')
  assert.equal(html('- +\n  ```\n  y\n  ```\nx\n'), '<ul>\n  <li>\n    <pre><code>y\n</code></pre>\n  </li>\n</ul>\n<p>x</p>')
})
