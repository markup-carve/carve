import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A footnote body takes a lazy line like every container (carve#3885, PART 0
// S4), so a line below a quoted note folds into the note's paragraph and opens
// no item or description paragraph. Until carve#3892 item 4 these rows pinned
// the retired reading, where the note closed the lazy claim.
const html = source => renderDoc(parse(source + '\n\nr[^n]\n')).replace(/\n[ \t]*(?=<)/g, '').trim()
const inNote = (out, letter, more = true) =>
  assert.match(out, new RegExp(`<li id="fn1"><p>note\\n${more ? 'more\\n' : ''}${letter}<a href="#fnref1"`))
const markers = ['- ', '1. ', '- [ ] ']

for (const marker of markers) for (const letter of ['q', 'z']) {
  test(`a quoted note takes the nested item's lazy line: ${marker.trim()}, ${letter}`, () => {
    const out = html([marker + 'h0', '  1. h1', '     > quote', '     > [^n]: note', '     >   more', letter].join('\n'))
    inNote(out, letter)
    assert.doesNotMatch(out, new RegExp(`<p>${letter}</p>|</ol>${letter}`))
  })
  test(`a quoted note takes the description's lazy line: ${marker.trim()}, ${letter}`, () => {
    const out = html([marker + 'h0', '  1. h1', '    :: term', '    :  detail', '       > quote', '       > [^n]: note', '       >   more', '    ' + letter].join('\n'))
    inNote(out, letter)
    assert.doesNotMatch(out, new RegExp(`<p>${letter}</p>|</dl>\\s*${letter}`))
  })
}

test('without the continuation line, the note takes the line too', () => {
  inNote(html('- h0\n  1. h1\n     > quote\n     > [^n]: note\nq'), 'q', false)
})

for (const depth of [1, 2]) {
  test(`quoted outer levels give the line to the note: ${depth}`, () => {
    const source = '- h0\n  1. h1\n    :: term\n    :  detail\n       > quote\n       > [^n]: note\n       >   more\n    q'
    const quoted = source.split('\n').map(line => '> '.repeat(depth) + line).join('\n')
    inNote(html(quoted), 'q')
  })
}

test('a third item level gives the lazy line to a quoted note', () => {
  inNote(html('- h0\n  1. h1\n     - h2\n       > quote\n       > [^n]: note\n       >   more\nq'), 'q')
})
