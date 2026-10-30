import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const shapes = JSON.parse(readFileSync(new URL('./fixtures/plus-below-nested-fence-shapes.json', import.meta.url), 'utf8'))

// A `+` attaches only a non-marker follower at its own column (carve#4409). The
// fixture predates that rule, so its html is compared for attached rows only and
// a refused `+` must read as a letter.
const attaches = (plus, follower) =>
  plus.search(/\S/) === follower.search(/\S/) && !/^\s*(?:[-*+]|\d+\.) /.test(follower)

test('a plus at the nested item marker column attaches below its fence', () => {
  assert.equal(Object.keys(shapes).length, 252)
  let attached = 0
  for (const [name, {source, html}] of Object.entries(shapes)) {
    const lines = source.split('\n')
    const at = lines.findLastIndex((line) => line.trim() === '+')
    const got = renderDoc(parse(source)).trim()
    if (attaches(lines[at], lines[at + 1])) {
      assert.equal(got, html, name)
      attached++
    } else {
      lines[at] = lines[at].replace('+', 'Z')
      assert.equal(got, renderDoc(parse(lines.join('\n'))).trim().replace('Z', '+'), name)
    }
  }
  assert.ok(attached > 0)
})

test('a plus at the inner marker column attaches at depth two', () => {
  assert.equal(renderDoc(parse('- - ```\n    x\n  +\n  tail\n')).trim(),
    '<ul>\n  <li>\n    <ul>\n      <li>\n        <pre><code>x\n</code></pre>\n        tail\n      </li>\n    </ul>\n  </li>\n</ul>')
})

test('a sibling marker refuses a plus below a fence', () => {
  assert.equal(renderDoc(parse('- ```\n  x\n+\n- y\n')).trim(),
    '<ul>\n  <li>\n    <pre><code>x\n</code></pre>\n  </li>\n</ul>\n<p>+\n- y</p>')
})
