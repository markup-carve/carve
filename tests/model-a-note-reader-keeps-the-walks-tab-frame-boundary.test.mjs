import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a note reader stops at the owner boundary after a tabbed nested payload block (carve#4085)', () => {
  for (const indent of ['  \t', '\t', '    ', '  \t  ']) for (const sigil of ['|', '\\']) {
    const source = `[^n]: a\n  [^n]: a\n${indent}::: ${sigil}\n[^n]\n\n[^n]\n`
    const trace = []
    const html = renderDoc(parse(source, { trace }))
    assert.equal((html.match(/role="doc-noteref"/g) ?? []).length, 2, `${indent}${sigil}`)
    assert.equal(trace.find(row => row.line === 4)?.owner, 'doc', `${indent}${sigil}`)
    assert.equal(trace.find(row => row.line === 6)?.owner, 'doc', `${indent}${sigil}`)
  }
})
