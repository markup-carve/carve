// carve#5520: inside a quote, a `>`-only line is blank at the quote's level, so a losing
// `[^m]: +` after a blank leaves its follower to the earlier `[^n]: +` exactly as unquoted
// (PART 9R R2, rows 981-3 and 981-4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src))
const notes = (html) => html.slice(html.indexOf('<section'))

test('the follower of a quoted losing plus of another label goes to the first note', () => {
  const html = render('> [^n]: +\n> [^m]: d1\n> [^m]: +\n>\n>   para\n\nsee[^n][^m]\n')
  assert.equal(html, `<blockquote>

</blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>d1<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>`)
})

for (const [name, prefix] of [['one quote', '> '], ['two quotes', '> > ']]) {
  for (const follower of ['  para', '    para', '  - li', '  > q']) {
    test(`${name}, follower ${JSON.stringify(follower)}: the notes match the unquoted document`, () => {
      const body = ['[^n]: +', '[^m]: d1', '[^m]: +', '', follower]
      const refs = '\n\nsee[^n][^m]\n'
      const plain = body.join('\n') + refs
      const quoted = body.map((line) => line === '' ? prefix.trimEnd() : prefix + line).join('\n') + refs
      assert.equal(notes(render(quoted)), notes(render(plain)))
    })
  }
}
