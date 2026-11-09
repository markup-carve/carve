import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

const noteWithFence = (item) => `<blockquote>

</blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>${item}
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>`

// carve#5556: CARVE-P2-008, the line after a quoted note's item fence leaves the quote.
test('an unprefixed line after a marker-line plus note item fence ends the quote', () => {
  assert.equal(html('> [^a]: +\n> - ```\nsee[^a]\n'), noteWithFence('\n          <pre><code></code></pre>'))
})

test('an unprefixed line after a plus note item fence with payload ends the quote', () => {
  assert.equal(html('> [^a]: +\n> - li\n>   ```\n>   code\nsee[^a]\n'),
    noteWithFence('li\n          <pre><code>code\n</code></pre>'))
})

test('a list marker that closes a quoted note paragraph opens a list in the quote', () => {
  const out = html('> [^a]: x\n> - ```\nsee[^a]\n')
  assert.match(out, /^<blockquote>\n {2}<ul>\n {4}<li>\n {6}<pre><code><\/code><\/pre>\n {4}<\/li>\n {2}<\/ul>\n<\/blockquote>\n<p>see/)
})
