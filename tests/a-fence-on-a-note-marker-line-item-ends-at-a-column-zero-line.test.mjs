import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

for (const chain of ['- ', '1. ', '- [ ] ', '- - ', '* ']) for (const fence of ['``` js', '~~~', '````']) {
  test(`${JSON.stringify(chain + fence)} in a note leaves a column-zero line to the document`, () => {
    const html = render(`[^n]: ${chain}${fence}\ntail\n\n[^n]\n`)
    assert.match(html, /^<p>tail<\/p>/)
    assert.match(html, /<pre><code[^>]*><\/code><\/pre>/)
  })
}

test('an unreferenced note does not take the line with it', () => {
  assert.equal(render('[^n]: - ``` js\ntail\n').trim(), '<p>tail</p>')
})

test('a note in an item leaves the line to the document', () => {
  assert.match(render('- [^n]: - ``` js\ntail\n\n[^n]\n'), /<\/ul>\n<p>tail<\/p>/)
})

test('a quoted note ends the quote at the line', () => {
  for (const chain of ['', '- ']) {
    assert.match(render(`> [^n]: ${chain}\`\`\` js\ntail\n\n[^n]\n`), /<\/blockquote>\n<p>tail<\/p>/)
  }
})

test('an over-indented fence line is payload, not a closer', () => {
  for (const pad of ['      ', '        ']) {
    assert.match(render(`[^n]: - \`\`\`\n${pad}\`\`\`\ntail\n\n[^n]\n`), /^<p>tail<\/p>/)
  }
})

test('a closed fence and a line at the item column are unchanged', () => {
  assert.match(render('[^n]: - ``` js\n    x\n    ```\n\n[^n]\n'), /<code class="language-js">x\n<\/code>/)
  assert.match(render('[^n]: - ``` js\n  tail\n\n[^n]\n'), /<p>tail<a href="#fnref1"/)
})
