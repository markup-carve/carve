import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const shapes = JSON.parse(readFileSync(new URL('./fixtures/plus-below-nested-fence-shapes.json', import.meta.url), 'utf8'))

// A `+` at the marker column is always a marker (carve#5013). The fixture
// pins both attached and refused outcomes at every measured depth.
const attaches = (plus, follower) =>
  plus.search(/\S/) === follower.search(/\S/) && !/^\s*(?:[-*+]|\d+\.) /.test(follower)

test('a plus at the nested item marker column attaches below its fence', () => {
  assert.equal(Object.keys(shapes).length, 252)
  let attached = 0
  for (const [name, {source, html}] of Object.entries(shapes)) {
    const lines = source.split('\n')
    const at = lines.findLastIndex((line) => line.trim() === '+')
    const got = renderDoc(parse(source)).trim()
    assert.equal(got, html, name)
    if (attaches(lines[at], lines[at + 1])) attached++
  }
  assert.ok(attached > 0)
})

test('a plus at the inner marker column attaches at depth two', () => {
  assert.equal(renderDoc(parse('- - ```\n    x\n  +\n  tail\n')).trim(),
    '<ul>\n  <li>\n    <ul>\n      <li>\n        <pre><code>x\n</code></pre>\n        tail\n      </li>\n    </ul>\n  </li>\n</ul>')
})

test('a sibling marker refuses a plus below a fence', () => {
  assert.equal(renderDoc(parse('- ```\n  x\n+\n- y\n')).trim(),
    '<ul>\n  <li>\n    <pre><code>x\n</code></pre>\n  </li>\n  <li>y</li>\n</ul>')
})
