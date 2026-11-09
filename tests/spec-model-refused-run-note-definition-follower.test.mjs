import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a note definition after a refused run remains in the list-hosted note paragraph (#5609)', () => {
  const source = '- [^a]: +\n  {#i\n  .y}\n  [^b]: z\n\nsee[^a][^b]\n'
  assert.equal(renderDoc(parse(source)).trim(), `<ul>
  <li></li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>[^b]</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>{#i
.y}
[^b]: z<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>`)
})
