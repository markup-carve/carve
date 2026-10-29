import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A fenced body is not a paragraph, so the unmarked line ends it and every container (carve#4018).
test("unmarked ``` at column 2 does not fold into the quoted description", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   : p\n>     ```\n  ```\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<pre><code></code></pre>")
})

test("unmarked ~~~ at column 2 does not fold into the quoted description", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   : p\n>     ~~~\n  ~~~\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<pre><code></code></pre>")
})

test("unmarked ``` at column 3 does not fold into the quoted description", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   : p\n>     ```\n   ```\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<pre><code></code></pre>")
})

test("unmarked ~~~ at column 3 does not fold into the quoted description", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   : p\n>     ~~~\n   ~~~\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<pre><code></code></pre>")
})

test("unmarked ```` at column 2 does not fold into the quoted description", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   : p\n>     ````\n  ````\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>\n<pre><code></code></pre>")
})

test("CONTROL: a closed quoted fence stays in the description", () => {
  assert.equal(renderDoc(parse("> - :: a\n>   : p\n>     ```\n>     ```\n")), "<blockquote>\n  <ul>\n    <li>\n      <dl>\n        <dt>a</dt>\n        <dd>\n          <p>p</p>\n          <pre><code></code></pre>\n        </dd>\n      </dl>\n    </li>\n  </ul>\n</blockquote>")
})

