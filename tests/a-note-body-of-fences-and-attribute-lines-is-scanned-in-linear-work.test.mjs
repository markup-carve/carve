// A note body resumes its open-fence search where the previous line's search left every fence closed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a note body of fence and attribute lines renders as before', () => {
  assert.equal(html('a[^n]\n\n[^n]: x\n  ```\n  {.x}\n  ```\n  {.x}\n'),
    '<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n      <p>x</p>\n      <pre><code>{.x}\n</code></pre>\n      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>\n    </li>\n  </ol>\n</section>')
  // An open fence still ends the body at a line below its column.
  assert.match(html('a[^n]\n\n[^n]: x\n  ```\n  {.x}\n  ```\n  ```\n  y\nz\n'), /<pre><code>y\n<\/code><\/pre>[\s\S]*<\/section>$/)
  assert.match(html('a[^n]\n\n[^n]: x\n  ```\n  {.x}\n  ```\n  ```\n  y\nz\n'), /<p>z<\/p>/)
})

const scans = (src) => {
  resetLayoutWork()
  parse(src)
  return layoutWork.closerScan
}

for (const [name, pair] of [
  ['an attribute line after each fence line', '  ```\n  {.x}\n'],
  ['an attribute line before each fence line', '  {.x}\n  ```\n'],
  ['a brace line after each fence line', '  ```\n  {a\n'],
]) {
  test(`a note body with ${name} reads its closers in linear work (carve#5889)`, () => {
    const small = scans('a[^n]\n\n[^n]: x\n' + pair.repeat(250))
    const large = scans('a[^n]\n\n[^n]: x\n' + pair.repeat(2000))
    assert.ok(large < small * 12, `250 pairs: ${small} closer reads, 2,000: ${large}`)
  })
}
