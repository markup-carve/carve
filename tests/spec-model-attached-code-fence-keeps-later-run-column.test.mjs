import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a later run at the item content column does not close a pulled fence (#5602)', () => {
  for (const [marker, column, tag] of [['- +', 2, 'ul'], ['1. +', 3, 'ol']]) {
    for (const extra of [0, 1, 3]) {
      const source = `${marker}\n\`\`\`\n\nx\n${' '.repeat(column + extra)}\`\`\`\n`
      assert.equal(html(source), `<${tag}>\n  <li>\n    <pre><code></code></pre>\n  </li>\n</${tag}>\n<p>x\n<code></code></p>`)
    }
  }
})

test('a blank inside a paired attached fence does not move a later independent fence', () => {
  assert.match(html('- +\n```\nx\n\n```\n\ny\n  ~~~\n'),
    /<p>y<\/p>\n<pre><code><\/code><\/pre>$/)
})

test('a heading ends the pulled fence host before an independent fence', () => {
  assert.match(html('- +\n~~~~\n\n# h\n  ~~~\ny\n'),
    /<h1>h<\/h1>\n  <pre><code>y\n<\/code><\/pre>/)
})

test('a shifted closer keeps the authored indentation of its payload (#5603)', () => {
  assert.equal(html('- +\n```\n\n x\n ```\n'),
    '<ul>\n  <li>\n    <pre><code>\n x\n</code></pre>\n  </li>\n</ul>')
  assert.equal(html('1. +\n```\n\n  x\n  ```\n'),
    '<ol>\n  <li>\n    <pre><code>\n  x\n</code></pre>\n  </li>\n</ol>')
})

