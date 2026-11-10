import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const source = '[^n]: p\n{% a\n%}\n[^m]: q\n\nx[^n]\n'

test('a lazy refused comment run protects a note definition follower', () => {
  assert.equal(modelTrace(source).find((record) => record.line === 4).owner, 'doc/footnote:1')
  assert.equal(renderDoc(parse(source)), [
    '<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>',
    '<section role="doc-endnotes" aria-label="Footnotes">',
    '  <hr>',
    '  <ol>',
    '    <li id="fn1">',
    '      <p>p',
    '{% a',
    '%}',
    '[^m]: q<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>',
    '    </li>',
    '  </ol>',
    '</section>',
  ].join('\n'))
})
