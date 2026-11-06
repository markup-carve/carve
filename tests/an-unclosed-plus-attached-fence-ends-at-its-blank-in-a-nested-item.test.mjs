import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5304: a `+` attached fence with no closer ends at its first blank
// (PART 9 §17 L3) however deep its host is, and the item holding that host
// reads the blank as its own separator.
const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

test('the reported document ends the fence at the blank', () => {
  assert.equal(html('- - +\n  ```\n\ntail\n'), '<ul><li><ul><li><pre><code></code></pre></li></ul></li></ul><p>tail</p>')
})

test('a nested host ends the fence as a top-level host does', () => {
  assert.match(html('- - +\n  ```\n\n'), /<li><pre><code><\/code><\/pre><\/li>/)
  assert.match(html('- +\n```\n\n'), /<li><pre><code><\/code><\/pre><\/li>/)
})

for (const [name, lead] of Object.entries({ 'a fence': '', 'an attribute line': '  {x}\n', 'a tilde fence': '' })) {
  test(`the line after the blank is the outer item's loose paragraph after ${name}`, () => {
    const fence = name === 'a tilde fence' ? '~~~' : '```'
    assert.match(html(`- - +\n${lead}  ${fence}\n\n  z\n`), /<\/ul><p>z<\/p><\/li><\/ul>$/)
  })
}

test('a closer after the blank keeps the blank in the fence', () => {
  assert.match(html('- - +\n  ```\n\n  z\n  ```\n- s\n'), /<pre><code>\nz<\/code><\/pre><\/li><\/ul><\/li><li>s<\/li>/)
})

test('a closer outside the item does not close the fence', () => {
  assert.match(html('- - +\n  ```\n\n  z\n```\n'), /<pre><code><\/code><\/pre><\/li><\/ul><p>z<\/p><\/li><\/ul><pre><code><\/code><\/pre>$/)
})
