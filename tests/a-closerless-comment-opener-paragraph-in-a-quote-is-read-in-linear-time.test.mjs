// Closerless `{%` openers in a quote reuse the paragraph end an earlier opener's scan reached.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('closerless openers in a quote stay paragraph text', () => {
  assert.equal(html('> {% a\n> {% a\n'), '<blockquote><p>{% a\n{% a</p></blockquote>')
  assert.equal(html('> - x\n>   {% a\n>   {% a\n'), '<blockquote>\n  <ul>\n    <li>x\n{% a\n{% a</li>\n  </ul>\n</blockquote>')
})

const views = (src) => {
  resetLayoutWork()
  parse(src)
  return layoutWork.views
}

for (const [name, shape] of [
  ['a quote', (n) => '> {% a\n'.repeat(n)],
  ['an item in a quote', (n) => '> - x\n' + '>   {% a\n'.repeat(n)],
  ['a lazy item line in a quote', (n) => '> - x\n' + '> {% a\n'.repeat(n)],
  ['a quote in an item', (n) => '- > x\n' + '  > {% a\n'.repeat(n)],
  ['a description in a quote', (n) => '> :: t\n> : d\n' + '>   {% a\n'.repeat(n)],
  ['a nested quote', (n) => '> > - x\n' + '> >   {% a\n'.repeat(n)],
]) {
  test(`closerless openers in ${name} are measured in linear work`, () => {
    const small = views(shape(250))
    const large = views(shape(2000))
    assert.ok(large < small * 12, `250 openers: ${small} views, 2,000: ${large}`)
  })
}
