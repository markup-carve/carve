// Refused `{%` openers that share one closer are decided without rescanning to it (carve#5859).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('only the last opener over its closer forms a comment', () => {
  assert.equal(html('- x\n\n  {% a\n  {% a\n   z %}\n- s\n'), '<ul>\n  <li><p>x</p>\n    <p>{% a\n</p>\n  </li>\n  <li><p>s</p></li>\n</ul>')
})

const elapsed = (src) => {
  const start = performance.now()
  renderDoc(parse(src))
  return performance.now() - start
}

for (const [name, shape] of [
  ['an item paragraph', (n) => '- x\n\n' + '  {% a\n'.repeat(n) + '   z %}\n- s\n'],
  ['a root paragraph', (n) => '{% a\n'.repeat(n) + ' z %}\n'],
  ['a quote paragraph', (n) => '> {% a\n'.repeat(n) + '>  z %}\n'],
]) {
  test(`repeated openers in ${name} are read in linear time`, () => {
    elapsed(shape(250))
    const small = elapsed(shape(500))
    const large = elapsed(shape(4000))
    assert.ok(large < small * 24, `500 openers: ${small.toFixed(0)} ms, 4,000: ${large.toFixed(0)} ms`)
  })
}
