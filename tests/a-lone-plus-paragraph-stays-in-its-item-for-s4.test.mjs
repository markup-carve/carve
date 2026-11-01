import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// A lone `+` gives its item one block and the item stays open (PART 9 §17 L3).
// S4 tests the lines after an attached paragraph against it (carve#4080).
const html = (source) => renderDoc(parse(source)).trim()
const flat = (source) => html(source).replace(/\s+/g, ' ').replace(/> </g, '><').replace(/> | </g, (s) => s.trim())

test('a sibling marker one column in interrupts the attached paragraph', () => {
  assert.equal(html('- a\n+\nq\n - c\n'), '<ul>\n  <li>a\n    q\n  </li>\n  <li>c</li>\n</ul>')
  assert.equal(flat('- `\n+\nd\n - s\n'), '<ul><li><code></code>d</li><li>s</li></ul>')
  assert.equal(flat('> - a\n> +\n> q\n>  - c\n'), '<blockquote><ul><li>a q</li><li>c</li></ul></blockquote>')
})

test('the walk owns the attached paragraph in the item', () => {
  const steps = modelTrace('- a\n+\nq\n - c\n').map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)
  assert.deepEqual(steps.slice(2), ['3 S5 doc/item:1 text', '4 S5 doc/item:4 item'])
})

test('lines after the attached paragraph read as they do without the `+`', () => {
  const cases = [
    ['- a\n+\nq\n * c\n', '<ul><li>a q</li></ul><ul><li>c</li></ul>'],
    ['- a\n+\nq\n 2. c\nz\n', '<ul><li>a q</li></ul><ol start="2"><li>c z</li></ol>'],
    ['- a\n+\nq\n  - c\n', '<ul><li>a q<ul><li>c</li></ul></li></ul>'],
    ['- a\n+\nq\n  # h\n', '<ul><li>a q<h1 id="h">h</h1></li></ul>'],
    ['- a\n+\nq\n  > z\n- c\n', '<ul><li>a q<blockquote><p>z</p></blockquote></li><li>c</li></ul>'],
    ['- a\n+\nq\n  ```\n  y\n  ```\n', '<ul><li>a q<pre><code>y</code></pre></li></ul>'],
    ['- a\n+\nq\n  {.c}\n  r\n', '<ul><li>a q<p class="c">r</p></li></ul>'],
    ['- x\n  - a\n  +\n  q\n    - c\n', '<ul><li>x<ul><li>a q<ul><li>c</li></ul></li></ul></li></ul>'],
    [':: t\n: a\n+\nq\n: d\n', '<dl><dt>t</dt><dd><p>a</p><p>q</p></dd><dd>d</dd></dl>'],
  ]
  for (const [source, expected] of cases) assert.equal(flat(source), expected, source)
})
