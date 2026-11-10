import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

// PART 0 S4: a valid lazy comment run leaves the note's paragraph open wherever its closer stands (carve#5768).
test('a lazy comment run under a marker-line note keeps the next lazy line in the note', () => {
  for (const pad of ['  ', '    ', '      ']) {
    assert.equal(html(`- [^n]: p\n{% a\n${pad}%}\ntext q\nafter\n\nx[^n]`),
      '<ul>\n  <li></li>\n</ul>\n<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n' +
      '<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n' +
      '      <p>p\n\ntext q\nafter<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>\n' +
      '    </li>\n  </ol>\n</section>')
  }
})
