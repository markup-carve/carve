import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a note-owned lazy line leaves its marker-line item invisible', () => {
  const source = 'r[^n]\n\n- [^n]: x\n  Body.\n\n  Two.\n'
  assert.equal(renderDoc(parse(source)),
    '<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n' +
    '<ul>\n  <li>Two.</li>\n</ul>\n' +
    '<section role="doc-endnotes" aria-label="Footnotes">\n' +
    '  <hr>\n  <ol>\n    <li id="fn1">\n' +
    '      <p>x\nBody.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>\n' +
    '    </li>\n  </ol>\n</section>')
})

for (const [marker, indent] of [['-', '  '], ['*', '  '], ['1.', '   '], ['- [ ]', '      ']]) {
  test(`${marker} keeps a note-owned first line invisible to list looseness`, () => {
    const doc = parse(`${marker} [^n]: x\n${indent}Body.\n\n${indent}Two.\n`)
    assert.equal(doc.blocks[0].tight, true)
    assert.equal(doc.blocks[0].items[0].blocks.length, 1)
  })
}
