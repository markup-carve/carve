import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const reference = '<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>'
const note = '<p>b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>'

test('a sigil payload opener uses its frame column in a nested note (carve#4085)', () => {
  for (const sigil of ['|', '\\']) for (const indent of ['  \t', '   \t', '      ']) {
    const source = `[^n]: a\n  [^n]: a\n${indent}::: ${sigil}\n  b\n\n[^n]\n`
    const trace = []
    const html = renderDoc(parse(source, { trace }))
    assert.ok(html.startsWith(reference), `${sigil} ${JSON.stringify(indent)}`)
    assert.ok(html.includes(note), `${sigil} ${JSON.stringify(indent)}`)
    assert.equal(trace.find(row => row.line === 4)?.owner, 'doc/footnote:1')
  }
})
