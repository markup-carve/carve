import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a comment span before a footnote attached fence stays invisible', () => {
  const source = '[^m]: +\n  %%%\n  q\n  %%%\n```\n\n```\n\nx[^m]\n'
  const output = html(source)
  assert.equal(output, '<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n      <pre><code>\n</code></pre>\n      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>\n    </li>\n  </ol>\n</section>')
})
