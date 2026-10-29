import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))
const outside = source => {
  const html = render(source)
  assert.match(html, /<pre><code><\/code><\/pre>\n  <\/li>\n<\/ul>\n<p>after<\/p>/)
  return html
}

for (const [child, outer] of [['```', '~~~'], ['```', '```'], ['~~~', '```']]) {
  test(`closed ${child} in a child releases an outer ${outer}`, () => {
    const source = `- a\n    - child\n      ${child}\n      x\n      ${child}\n  ${outer}\nafter\n`
    assert.match(outside(source), /<li>child\n\s*<pre><code>x\n<\/code><\/pre>/)
  })
}

test('quoted child releases an outer fence for unprefixed and prefixed lines', () => {
  const prefix = '> - a\n>     - child\n>       ```\n>       x\n>       ```\n>   ~~~\n'
  assert.match(render(prefix + 'after\n'), /<\/blockquote>\n<p>after<\/p>/)
  assert.match(render(prefix + '> after\n'), /<p>after<\/p>\n<\/blockquote>/)
})

test('a heading leaves no child paragraph', () => {
  assert.match(outside('- a\n    - # h\n  ~~~\nafter\n'), /<h1 id="h">h<\/h1>/)
})

// A fence opens under a paragraph without a closer (carve#4018).
test('an unclosed child fence ends at a line below the child column', () => {
  const html = render('- a\n    - child\n      ```\n      x\n  ~~~\nafter\n')
  assert.match(html, /<li>child\n\s*<pre><code>x\n<\/code><\/pre>\n\s*<\/li>\n\s*<\/ul>\n\s*<pre><code><\/code><\/pre>/)
  assert.match(html, /<p>after<\/p>$/)
})

test('a closerless fence interrupts an open child paragraph', () => {
  const html = render('- a\n    - child\n      text\n  ~~~\nafter\n')
  assert.match(html, /<li>child\ntext<\/li>\n\s*<\/ul>\n\s*<pre><code><\/code><\/pre>/)
  assert.match(html, /<p>after<\/p>$/)
})
