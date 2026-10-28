import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()
const markers = ['- ', '1. ', '- [ ] ']

for (const marker of markers) for (const note of [true, false]) {
  test(`a term below a child item's column opens in its description: ${marker.trim()}, note ${note}`, () => {
    const lines = [':: t', ': d']
    if (note) lines.push('  [^n]: note')
    lines.push('  ' + marker + 'a', '   :: u', '   :  e')
    const out = html(lines.join('\n'))
    if (note) assert.equal(out, '<dl><dt>t</dt><dd><p>d</p><dl><dt>u</dt><dd>e</dd></dl></dd></dl>')
    else assert.match(out, /<p>d\n(?:-|1\.|- \[ \]) a<\/p><dl><dt>u<\/dt><dd>e<\/dd><\/dl><\/dd><\/dl>$/)
  })
}

test('the same ownership holds when the description sits in an item', () => {
  assert.match(html('- h0\n  :: t\n  : d\n    [^n]: note\n    - a\n     :: u\n     :  e'), /<dl><dt>u<\/dt><dd>e<\/dd><\/dl>/)
})
