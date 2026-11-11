import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
// A term behind `markers`, a description, a block at the description's body
// column, a text line at the innermost item's column, then an unmarked line.
const shape = (depth, markers, body, block) => {
  const q = '> '.repeat(depth)
  const col = markers.join('').length
  const pad = ' '.repeat(col)
  const note = body.startsWith('[^')
  const lines = [`${q}${markers.join('')}:: t`, `${q}${pad}: ${body}`, `${q}${pad}  ${block}`, `${q}${pad}z`, 'plain']
  return lines.join('\n') + '\n' + (note ? '\nx[^n]\n' : '')
}

test('an unmarked line after a span its item ended folds into the item paragraph (carve#5969)', () => {
  for (const depth of [0, 1, 2, 3]) {
    for (const markers of [['- '], ['1. '], ['* '], ['- ', '- '], ['1. ', '- ']]) {
      for (const body of ['d', '[^n]: a']) {
        for (const block of ['%%%', '```', '~~~']) {
          const source = shape(depth, markers, body, block)
          assert.match(html(source), /\bz\nplain\n/, JSON.stringify(source))
        }
      }
    }
  }
})

test('the reproduction keeps plain in the item, two quotes deep (carve#5969)', () => {
  const out = html('> > - :: t\n> >   : [^n]: a\n> >     %%%\n> >   z\nplain\n\nx[^n]\n')
  assert.match(out, /<\/dl>\n {8}z\nplain\n {6}<\/li>/)
  assert.doesNotMatch(out, /<p>plain<\/p>/)
})
