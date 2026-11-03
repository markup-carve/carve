import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const flat = (source) => html(source).replace(/\s+/g, ' ')

test('a line below the item ends a description-lead span and the item (carve#4878)', () => {
  const after = '<ul> <li>a <dl> <dt>u</dt> <dd></dd> </dl> </li> </ul> <p>zz</p>'
  assert.equal(flat('- a\n  :: u\n  : %%%\n    n\nzz\n%%%\n'), after)
  assert.equal(flat('- a\n  :: u\n  : %%%\n    n\nzz\n'), after)
  assert.equal(flat('> - a\n>   :: u\n>   : %%%\n>     n\nzz\n'),
    '<blockquote> <ul> <li>a <dl> <dt>u</dt> <dd></dd> </dl> </li> </ul> </blockquote> <p>zz</p>')
  assert.equal(flat('- a\n  > :: u\n  > : %%%\nzz\n'),
    '<ul> <li>a <blockquote> <dl> <dt>u</dt> <dd></dd> </dl> </blockquote> </li> </ul> <p>zz</p>')
})

test('a line at the item column still lands in the item', () => {
  assert.equal(flat('- a\n  :: u\n  : %%%\n    n\n  zz\n%%%\n'),
    '<ul> <li>a <dl> <dt>u</dt> <dd></dd> </dl> zz </li> </ul>')
})

// The span leaves nothing (CARVE-P9-047), so its payload lines cannot change
// where the line after it goes.
test('a span body line changes nothing for the line after it', () => {
  const hosts = [['', ''], ['- a\n', '  '], ['- - a\n', '    '], ['', '> '], ['> - a\n', '>   '], ['- a\n', '  > ']]
  const bodies = ['n', 'n\n\nm', '%% c', 'x %%']
  const tails = ['zz', ' zz', '  zz', '- zz', '> zz']
  let checked = 0
  for (const [head, prefix] of hosts) for (const run of ['%%%', '%%%%']) for (const body of bodies) for (const tail of tails) for (const end of ['', '%%%\n']) {
    const opened = `${head}${prefix}:: u\n${prefix}: ${run}\n`
    const payload = body.split('\n').map((line) => line ? `${prefix}  ${line}` : prefix.trimEnd()).join('\n') + '\n'
    const withBody = opened + payload + tail + '\n' + end
    assert.equal(flat(withBody), flat(opened + tail + '\n' + end), JSON.stringify(withBody))
    checked++
  }
  assert.equal(checked, 480)
})
