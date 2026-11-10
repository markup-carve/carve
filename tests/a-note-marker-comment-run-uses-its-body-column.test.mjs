import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a note marker comment run uses its body column before a block attribute', () => {
  const source = 'x[^n]\n\n[^n]: {% a\n     b\n     z %}\n    {.x}\nplain\n'
  assert.equal(renderDoc(parse(source)), [
    '<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>',
    '<p>plain</p>',
    '<section role="doc-endnotes" aria-label="Footnotes">',
    '  <hr>',
    '  <ol>',
    '    <li id="fn1">',
    '      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>',
    '    </li>',
    '  </ol>',
    '</section>',
  ].join('\n'))
})
