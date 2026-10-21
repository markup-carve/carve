import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()
const markers = ['- ', '1. ', '- [ ] ']
const wrap = (source, depth) => source.split('\n').map(line => '> '.repeat(depth) + line).join('\n')

for (const outer of markers) for (const inner of markers) for (const depth of [0, 1, 2]) {
  test(`closed child leaves quote to surviving item: ${outer.trim()}, ${inner.trim()}, quote ${depth}`, () => {
    const source = [outer + 'h0', '  ' + inner + 'h1', '    :: term', '    :  detail', '     > quote'].join('\n')
    const out = html(wrap(source, depth))
    assert.match(out, /<\/dl><blockquote><p>quote<\/p><\/blockquote>/)
    assert.doesNotMatch(out, /&gt; quote/)
  })
}

test('the quote also opens without a nested list', () => {
  assert.match(html('- h0\n  :: term\n  : detail\n   > quote'), /<\/dl><blockquote><p>quote<\/p><\/blockquote>/)
})

for (const depth of [0, 1, 2]) {
  test(`a third list level closes before the surviving owner's quote: outer quote ${depth}`, () => {
    const source = '- h0\n  1. h1\n     - h2\n    :: term\n    :  detail\n     > quote'
    const out = html(wrap(source, depth))
    assert.match(out, /<\/ol><dl><dt>term<\/dt><dd>detail<\/dd><\/dl><blockquote><p>quote<\/p><\/blockquote>/)
  })
}
