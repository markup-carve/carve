import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// The quoted run opens a fence without a closer (carve#4018); the unmarked run
// leaves the quote and opens one of its own at document level.
const opened = "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<pre><code></code></pre>"
for (const [run, column] of [["```", 2], ["~~~", 2], ["```", 3], ["~~~", 3], ["````", 2]]) {
  test(`unmarked ${run} at column ${column} leaves the quoted description`, () => {
    assert.equal(renderDoc(parse(`> - :: a\n>   : p\n>     ${run}\n${" ".repeat(column)}${run}\n`)), opened)
  })
}

test("CONTROL: a closed quoted fence stays in the description", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   : p\n>     ```\n>     ```\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>")
})

