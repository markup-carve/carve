import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// A span leaves nothing however it ends (CARVE-P9-047, carve#4956), so a
// document with the span deleted is the oracle.
const hosts = [
  ['- ', '  '], ['- a\n  - ', '    '], ['- - ', '    '], ['1. ', '   '], ['> ', '> '], ['> > ', '> > '],
  ['> - ', '>   '], ['- > ', '  > '], [':: t\n: ', '  '], ['see[^n]\n\n[^n]: ', '    '], ['- a\n\n  ', '  '],
]
const befores = [[], ['x'], ['x', ''], ['%% c'], ['x', 'y'], ['', 'x'], ['x', '%%%', 's', '%%%']]
const spans = [['%%%'], ['%%%', 's'], ['%%%', 's', '%%%'], ['%%%%', 's', '%%%'], ['  %%%', 's'], ['%%% t', '', 's'], ['%%%', 's', '%%%%']]
const lazies = [['b', 'c'], ['b', '', 'z']]
const tails = [null, 'c', ':::']

test('a line after a verse span reads the stanza as if the span were not there', () => {
  let checked = 0
  for (const [first, body] of hosts) for (const before of befores) for (const span of spans) for (const lazy of lazies) for (const tail of tails) {
    // Four columns past a footnote body the opener is verse text, not a span.
    if (first.startsWith('see') && span[0].startsWith(' ')) continue
    const doc = (rows) => first + '::: |\n' + rows.map((l) => (l === '' ? body.trimEnd() : body + l)).join('\n') +
      (rows.length ? '\n' : '') + lazy.join('\n') + '\n' + (tail === null ? '' : body + tail + '\n')
    assert.equal(html(doc([...before, ...span])), html(doc(before)), JSON.stringify(doc([...before, ...span])))
    checked++
  }
  assert.equal(checked, 3192)
})

test('the ticket shapes (carve#4956)', () => {
  assert.equal(html('- a\n  - ::: |\n    %%%\nb\n'), html('- a\n  - ::: |\nb\n'))
  assert.match(html('- ::: |\n  x\n  %%%\nb\n'), /<p>x<br>\nb<\/p>/)
  assert.match(html('> ::: |\n> x\n> %%%\nb\n'), /<p>x<br>\nb<\/p>/)
  assert.match(html('> > ::: |\n> > %%%\ny\n'), /<\/blockquote>\n<p>y<\/p>$/)
})
