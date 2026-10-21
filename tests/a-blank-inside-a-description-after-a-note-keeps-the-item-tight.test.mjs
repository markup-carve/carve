import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()
const markers = ['- ', '1. ', '- [ ] ']

for (const marker of markers) for (const note of [true, false]) {
  test(`a description owns its blank and paragraph: ${marker.trim()}, note ${note}`, () => {
    const base = ' '.repeat(marker.length)
    const lines = [marker + 'h0', base + ':: t', base + ': d']
    if (note) lines.push(base + '  [^n]: note')
    lines.push(base + '   :: u', base + '   :  e', '', base + '   x')
    const out = html(lines.join('\n'))
    assert.match(out, /h0<dl>/)
    assert.doesNotMatch(out, /<li><p>h0<\/p>/)
    assert.match(out, /<dd><p>d<\/p><dl><dt>u<\/dt><dd>e<\/dd><\/dl><p>x<\/p><\/dd>/)
  })
}

test('the nested ordered item stays tight', () => {
  const out = html('- h0\n  1. h1\n     :: t\n     : d\n       [^n]: note\n        :: u\n        :  e\n\n        x')
  assert.match(out, /<li>h1<dl>/)
  assert.doesNotMatch(out, /<li><p>h1<\/p>/)
})
