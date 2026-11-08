import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

const reference = '<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>'
const backlink = '<p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>'
const endnote = (body) => `<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n${body}\n      ${backlink}\n    </li>\n  </ol>\n</section>`

test('a quote-shaped line in a note-attached list item fence stays payload', () => {
  const source = '- [^a]: +\n  - li\n    ```\n    > quoted\n\nsee[^a]\n'
  const expected = `<ul>\n  <li></li>\n</ul>\n${reference}\n${endnote('      <ul>\n        <li>li\n          <pre><code>&gt; quoted\n\n</code></pre>\n        </li>\n      </ul>')}`
  assert.equal(html(source), expected)
})

test('a quote after a closed child fence ends the note attachment', () => {
  const source = '[^a]: +\n- li\n  ```\n  code\n  ```\n> later\n\nsee[^a]\n'
  const output = html(source)
  assert.match(output, /<pre><code>code\n<\/code><\/pre>/)
  assert.match(output, /<blockquote><p>later<\/p><\/blockquote>/)
  assert.doesNotMatch(output, /<code>code\n&gt; later/)
})

for (const payload of ['+', 'another', '- sib', '> q']) {
  test(`a child fence keeps ${payload} after a blank in a note-attached list`, () => {
    const source = `[^a]: +\n- li\n  \`\`\`\n  code\n\n  ${payload}\n\nsee[^a]\n`
    const escaped = payload.replace('>', '&gt;')
    assert.match(html(source), new RegExp(`<pre><code>code\\n\\n${escaped.replace(/[+]/g, '\\$&')}\\n\\n<\\/code><\\/pre>`))
  })
}
