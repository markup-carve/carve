import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test("an unmarked term at column 1 ends the quote", () => {
  assert.equal(renderDoc(parse("> - :: a\n :: b\n>   : p\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<dl>\n  <dt>b</dt>\n</dl>\n<blockquote><p>: p</p></blockquote>")
})

test("an unmarked term at column 2 ends the quote", () => {
  assert.equal(renderDoc(parse("> - :: a\n  :: b\n>   : p\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<dl>\n  <dt>b</dt>\n</dl>\n<blockquote><p>: p</p></blockquote>")
})

test("an unmarked term at column 3 ends the quote", () => {
  assert.equal(renderDoc(parse("> - :: a\n   :: b\n>   : p\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<dl>\n  <dt>b</dt>\n</dl>\n<blockquote><p>: p</p></blockquote>")
})

test("an unmarked term at column 4 ends the quote", () => {
  assert.equal(renderDoc(parse("> - :: a\n    :: b\n>   : p\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<dl>\n  <dt>b</dt>\n</dl>\n<blockquote><p>: p</p></blockquote>")
})

test("CONTROL: a marked sibling term stays a term", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   :: b\n>   : p\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dt>b</dt>\n        <dd>p</dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>")
})

