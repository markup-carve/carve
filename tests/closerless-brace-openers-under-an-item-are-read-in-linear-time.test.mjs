// Each lazy closerless opener's rule B lookahead must not rescan the rest of the paragraph.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const elapsed = (lead, unit, n) => {
  const src = lead + unit.repeat(n)
  const start = performance.now()
  parse(src)
  return performance.now() - start
}

for (const [lead, unit] of [['- p\n', '{bad\n'], ['[^n]: p\n  - a\n', '{bad\n'], ['> - p\n', '> {bad\n'], ['- p\n', '{% bad\n']]) {
  test(`${JSON.stringify(lead + unit)} repeated is read in linear time`, () => {
    elapsed(lead, unit, 500)
    const small = Math.max(elapsed(lead, unit, 1000), 1)
    const large = elapsed(lead, unit, 8000)
    assert.ok(large < small * 24, `1,000 lines: ${small.toFixed(0)} ms, 8,000: ${large.toFixed(0)} ms`)
  })
}

test('a quote opened on a continuation line without a brace keeps the run in the item's paragraph', () => {
  assert.equal(renderDoc(parse('> - p\n> > {.x\n> "abc\n> }\nx\n')).trim(),
    '<blockquote>\n  <ul>\n    <li>p\n&gt; {.x\n“abc\n}\nx</li>\n  </ul>\n</blockquote>')
})
