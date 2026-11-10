import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()
const closesItem = source => html(source).startsWith('<ul>\n  <li>a</li>\n</ul>')

// CARVE-P9-042 and carve#5837: a braced comment line that starts a paragraph is
// invisible only when the whole paragraph is; text after it places it by S2.
test('a braced comment paragraph with text misses the item it is left of', () => {
  for (const comment of ['{%%}', '{% c %}', '{%a%} {%b%}', '{% c\nd %}'])
    for (const [after, text] of [['  z', 'z'], [' z', 'z'], ['z', 'z'], ['  - b', '- b']]) {
      assert.ok(closesItem(`- a\n\n${comment}\n${after}`), JSON.stringify([comment, after]))
      assert.ok(html(`- a\n\n${comment}\n${after}`).endsWith(`${text}</p>`), JSON.stringify([comment, after]))
    }
})

test('a braced comment line still interrupts nothing in an open paragraph', () => {
  assert.equal(html('- a\n{%%}\n  z'), '<ul>\n  <li>a\n\nz</li>\n</ul>')
  assert.equal(html('- a\n\n  {%%}\n  - b'), '<ul>\n  <li><p>a</p>\n    <ul>\n      <li>b</li>\n    </ul>\n  </li>\n</ul>')
})

// PART 0 S3 and carve#5841: a `: ` line continues an entry only when the line
// above it is the entry's term or a description that is itself one.
test('a colon line with no live term above opens no lead span', () => {
  for (const above of ['  : ', '  : x', '  : \n  : ', '  w\n  : ', '  :: t\n    deep\n  : d'])
    for (const gap of ['\n', '']) {
      const out = html(`- a\n${above}\n${gap}  : %%%\n%%%\nc`)
      assert.ok(!out.includes('<p>c</p>'), JSON.stringify([above, gap]))
    }
})

test('a description under a live term still opens its lead span', () => {
  for (const above of ['  :: t', '  :: t\n  : d', '  :: t\n  : d\n    more'])
    assert.ok(html(`- a\n${above}\n\n  : %%%\n%%%\nc`).endsWith('<p>c</p>'), above)
})
