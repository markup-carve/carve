import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('block-shaped continuations of a valid item comment run are comment text (carve#5756)', () => {
  assert.equal(html('- p\n  {% a\n   # h\n   z %}\n'), '<ul>\n  <li>p\n</li>\n</ul>')
  assert.equal(html('- {% a\n   - li\n   z %}\n'), '<ul>\n  <li></li>\n</ul>')
  assert.equal(html('- {% a\n   ```\n   z %}\nplain\n'), '<ul>\n  <li>\nplain</li>\n</ul>')
  assert.equal(html('{% a\n > q\n z %}\n'), '')
})

test('a valid comment run reads the same whatever block its continuation spells (carve#5756)', () => {
  const hosts = [['', ''], ['- ', '  '], ['1. ', '   '], ['- [ ] ', '      '], ['> ', '> '], ['> - ', '>   '],
    ['- - ', '    '], ['- a\n  - ', '    '], ['> > - ', '> >   '], [':: t\n: ', '  ']]
  const shapes = ['# h', '- li', '1. x', '```', '~~~', '> q', '::: x', '| t |', ': d', '[^n]: x', '---', '[x]: /u', '{.x}']
  for (const [lead, pad] of hosts) for (const para of [false, true]) for (const tail of ['', 'plain\n']) {
    const doc = (line) => `${lead}${para ? `p\n${pad}` : ''}{% a\n${pad}  ${line}\n${pad}  z %} y\n${tail}`
    const expected = html(doc('b'))
    for (const shape of shapes) assert.equal(html(doc(shape)), expected, JSON.stringify(doc(shape)))
  }
})
