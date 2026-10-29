import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test("a closed below-description ``` opens in the item, column 4, quote False", () => {
  assert.equal(renderDoc(parse("- :: t\n  :   p\n    ```\n  ```\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>p</dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>")
})

test("a closed below-description ~~~ opens in the item, column 4, quote False", () => {
  assert.equal(renderDoc(parse("- :: t\n  :   p\n    ~~~\n  ~~~\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>p</dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>")
})

test("a closed below-description ``` opens in the item, column 4, quote True", () => {
  assert.equal(renderDoc(parse("> - :: t\n>   :   p\n>     ```\n>   ```\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>t</dt>\n        <dd>p</dd>\n      </dl>\n      <pre><code></code></pre>\n    </li>\n  </ul>\n</blockquote>")
})

test("a closed below-description ~~~ opens in the item, column 4, quote True", () => {
  assert.equal(renderDoc(parse("> - :: t\n>   :   p\n>     ~~~\n>   ~~~\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>t</dt>\n        <dd>p</dd>\n      </dl>\n      <pre><code></code></pre>\n    </li>\n  </ul>\n</blockquote>")
})

test("a closed below-description ``` opens in the item, column 5, quote False", () => {
  assert.equal(renderDoc(parse("- :: t\n  :   p\n     ```\n  ```\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>p</dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>")
})

test("a below-description run without a closer opens in the item too", () => {
  assert.equal(renderDoc(parse("- :: t\n  :   p\n    ```\n")), "<ul>\n  <li>\n    <dl>\n      <dt>t</dt>\n      <dd>p</dd>\n    </dl>\n    <pre><code></code></pre>\n  </li>\n</ul>")
})

