import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test("a below-description ``` after opaque quote opens in the item, column 6, quote False", () => {
  assert.equal(renderDoc(parse("- :: t\n  :   p\n      > ```\n     ```\n text\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>\n        <p>p</p>\n        <blockquote>\n          <pre><code></code></pre>\n        </blockquote>\n      </dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>text</p>")
})

test("a below-description ~~~ after opaque quote opens in the item, column 6, quote False", () => {
  assert.equal(renderDoc(parse("- :: t\n  :   p\n      > ~~~\n     ~~~\n text\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>\n        <p>p</p>\n        <blockquote>\n          <pre><code></code></pre>\n        </blockquote>\n      </dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>text</p>")
})

test("a below-description ``` after opaque quote opens in the item, column 6, quote True", () => {
  assert.equal(renderDoc(parse("> - :: t\n>   :   p\n>       > ```\n>      ```\n>  text\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>t</dt>\n        <dd>\n          <p>p</p>\n          <blockquote>\n            <pre><code></code></pre>\n          </blockquote>\n        </dd>\n      </dl>\n      <pre><code></code></pre>\n    </li>\n  </ul>\n  <p>text</p>\n</blockquote>")
})

test("a below-description ~~~ after opaque quote opens in the item, column 6, quote True", () => {
  assert.equal(renderDoc(parse("> - :: t\n>   :   p\n>       > ~~~\n>      ~~~\n>  text\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>t</dt>\n        <dd>\n          <p>p</p>\n          <blockquote>\n            <pre><code></code></pre>\n          </blockquote>\n        </dd>\n      </dl>\n      <pre><code></code></pre>\n    </li>\n  </ul>\n  <p>text</p>\n</blockquote>")
})

test("a below-description ``` after opaque quote opens in the item, column 7, quote False", () => {
  assert.equal(renderDoc(parse("- :: t\n  :    p\n       > ```\n      ```\n text\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>\n        <p>p</p>\n        <blockquote>\n          <pre><code></code></pre>\n        </blockquote>\n      </dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>text</p>")
})

test("CONTROL: a quote ending in prose does not take the fence lazily", () => {
  assert.equal(renderDoc(parse("- :: t\n  :   p\n      > words\n     ```\n text\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>\n        <p>p</p>\n        <blockquote><p>words</p></blockquote>\n      </dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>text</p>")
})

