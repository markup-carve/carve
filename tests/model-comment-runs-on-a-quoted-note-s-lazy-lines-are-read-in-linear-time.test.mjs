// Wrapped `{%` runs on a quoted note's lazy lines reuse the open-paragraph answer (carve#5911).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const shape = (n) => '> [^n]: b\n' + '> {% c\n>   z %}\n'.repeat(n) + '- s\n\nx[^n]\n'

test('comment runs on a quoted note\'s lazy lines stay in the note paragraph', () => {
  assert.equal(renderDoc(parse(shape(2))), `<blockquote>

</blockquote>
<ul>
  <li>s</li>
</ul>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>b

<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>`)
})

const work = (src) => {
  resetLayoutWork()
  renderDoc(parse(src))
  return layoutWork.commentTail + layoutWork.paragraphProbe
}

for (const [name, build] of [
  ['a quoted note', shape],
  ['a note', (n) => '[^n]: b\n' + '{% c\n  z %}\n'.repeat(n) + '- s\n\nx[^n]\n'],
  ['a note in a nested quote', (n) => '> > [^n]: b\n' + '> > {% c\n> >   z %}\n'.repeat(n) + '\nx[^n]\n'],
]) {
  test(`comment runs on the lazy lines of ${name} are probed in linear work`, () => {
    const small = work(build(100))
    const large = work(build(800))
    assert.ok(large <= small * 12 + 100, `100 runs: ${small}, 800: ${large}`)
  })
}
