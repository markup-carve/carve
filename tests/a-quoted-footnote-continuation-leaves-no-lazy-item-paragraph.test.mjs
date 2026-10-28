import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()
const markers = ['- ', '1. ', '- [ ] ']

for (const marker of markers) for (const letter of ['q', 'z']) {
  test(`a quoted note closes the nested item's lazy claim: ${marker.trim()}, ${letter}`, () => {
    const out = html([marker + 'h0', '  1. h1', '     > quote', '     > [^n]: note', '     >   more', letter].join('\n'))
    assert.match(out, new RegExp(`<\\/ul>|<\\/ol>`))
    assert.match(out, new RegExp(`<p>${letter}<\\/p>$`))
    assert.doesNotMatch(out, new RegExp(`<\\/ol>${letter}`))
  })
  test(`a quoted note closes the description's lazy claim: ${marker.trim()}, ${letter}`, () => {
    const out = html([marker + 'h0', '  1. h1', '    :: term', '    :  detail', '       > quote', '       > [^n]: note', '       >   more', '    ' + letter].join('\n'))
    // An indented `1.` is a sibling of `1. h0`, so the term below it ends the list.
    assert.match(out, new RegExp(marker === '1. ' ? `<\\/ol><dl>[^]*<\\/dl><p>${letter}<\\/p>$` : `<\\/dl>\\s*${letter}<\\/li>`))
    assert.doesNotMatch(out, new RegExp(`<dd>[^]*<p>${letter}<\\/p><\\/dd>`))
  })
}

test('without the continuation line, the note already closes the item', () => {
  assert.match(html('- h0\n  1. h1\n     > quote\n     > [^n]: note\nq'), /<\/ul><p>q<\/p>$/)
})

for (const depth of [1, 2]) {
  test(`quoted outer levels preserve the surviving item after the note: ${depth}`, () => {
    const source = '- h0\n  1. h1\n    :: term\n    :  detail\n       > quote\n       > [^n]: note\n       >   more\n    q'
    const quoted = source.split('\n').map(line => '> '.repeat(depth) + line).join('\n')
    assert.match(html(quoted), /<\/dl>\s*q<\/li>/)
  })
}

test('a third item level does not keep a lazy paragraph after a quoted note', () => {
  const out = html('- h0\n  1. h1\n     - h2\n       > quote\n       > [^n]: note\n       >   more\nq')
  assert.match(out, /<\/ul><p>q<\/p>$/)
})
