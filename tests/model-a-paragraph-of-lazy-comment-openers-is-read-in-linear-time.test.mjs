// Lazy `{%` openers that fold into a container's paragraph are decided without rescanning per line (carve#5870).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('lazy openers stay paragraph text in their host', () => {
  assert.equal(html('- x\n{% a\n{% a\n z %}\n'), '<ul>\n  <li>x\n{% a\n{% a\nz %}</li>\n</ul>')
  assert.equal(html('> - x\n> {% a\n> {% a\n>  z %}\n'), '<blockquote>\n  <ul>\n    <li>x\n{% a\n{% a\nz %}</li>\n  </ul>\n</blockquote>')
  assert.equal(html(':: t\n: d\n{% a\n{% a\n z %}\n'), '<dl>\n  <dt>t</dt>\n  <dd>d\n{% a\n{% a\nz %}</dd>\n</dl>')
})

const elapsed = (src) => {
  const start = performance.now()
  renderDoc(parse(src))
  return performance.now() - start
}

for (const [name, shape] of [
  ['an item', (n) => '- x\n' + '{% a\n'.repeat(n) + ' z %}\n'],
  ['an item in a quote', (n) => '> - x\n' + '> {% a\n'.repeat(n) + '>  z %}\n'],
  ['a footnote', (n) => '[^n]: x\n' + '{% a\n'.repeat(n) + ' z %}\n'],
  ['a description', (n) => ':: t\n: d\n' + '{% a\n'.repeat(n) + ' z %}\n'],
  ['a description with closed comments', (n) => ':: t\n: d\n' + '{% a %}\n'.repeat(n)],
]) {
  test(`lazy openers in ${name} are read in linear time`, () => {
    elapsed(shape(250))
    const small = elapsed(shape(500))
    const large = elapsed(shape(4000))
    assert.ok(large < small * 24, `500 openers: ${small.toFixed(0)} ms, 4,000: ${large.toFixed(0)} ms`)
  })
}
