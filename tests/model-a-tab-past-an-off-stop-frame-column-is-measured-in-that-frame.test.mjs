import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a tab past an off-stop item column reaches the nested item (carve#4085)', () => {
  assert.match(html('- 1. a\n  \t```\n  \tx\n  \t```\n'), /<li>a\n\s*<pre><code>x\n<\/code><\/pre>\n\s*<\/li>\n\s*<\/ol>/)
  assert.match(html('- - 10. a\n\n  \t  b\n'), /<li><p>a<\/p>\n\s*<p>b<\/p>/)
})

test('the same run of spaces is unchanged', () => {
  assert.match(html('- 1. a\n     ```\n     x\n     ```\n'), /<li>a\n\s*<pre><code>x/)
  assert.match(html('- 1. a\n    ```\n    x\n    ```\n'), /<\/ol>\n\s*<pre><code>x/)
})

test('a tab on a stop at every frame is unchanged', () => {
  assert.match(html('- a\n\n\tb\n'), /<li><p>a<\/p>\n\s*<p>b<\/p>/)
})

test('a quote prefix restarts the measure', () => {
  assert.match(html('> - 1. a\n>   \t```\n>   \tx\n>   \t```\n'), /<li>a\n\s*<pre><code>x/)
})
