import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const HOSTS = {
  item: ['- p', 2],
  description: [':: t\n: p', 2],
  note: ['[^n]: p', 2],
  'wrapped item': ['- p\n  q', 2],
  'nested item': ['- a\n  - p', 4],
  'description in an item': ['- a\n  :: t\n  : p', 4],
  'note in an item': ['- [^n]: p', 4],
  'note in a description': [':: t\n: [^n]: p', 4],
  'quote in an item': ['- > p', 2],
  'quote in a description': [':: t\n: > p', 2],
  'quote in a note': ['[^n]: > p', 2],
}
const PREFIXES = ['', '> ', '> > ']
const MARKERS = ['- m', '* m', '1. m', 'a) m', '- [ ] m']

// A one-line comment has no layout boundary under the later carve#5012 ruling.
// Its quote markers remain structural, even when its content disappears.
for (const [name, [host, column]] of Object.entries(HOSTS)) for (const prefix of PREFIXES) for (const marker of MARKERS) {
  test(`${marker} after ${name} under ${JSON.stringify(prefix)} reads after an erased comment`, () => {
    const body = host.split('\n').map((line) => prefix + line).join('\n')
    for (const pad of [0, 1, column - 1, column, column + 1, column + 2]) {
      const line = prefix + ' '.repeat(pad)
      const tail = `\ntail\n\nr[^n]\n`
      const retained = prefix ? `${prefix.trimEnd()}\n` : ''
      assert.equal(html(`${body}\n${retained}${line}${marker}${tail}`), html(`${body}\n${line}%%\n${line}${marker}${tail}`), `${pad} ${body}`)
    }
  })
}

test('a marker that misses a body in a nested quote closes every frame', () => {
  for (const prefix of ['> ', '> > ', '> > > ']) {
    for (const host of [':: t\n: p', '- p', '[^n]: p']) {
      const body = host.split('\n').map((line) => prefix + line).join('\n')
      assert.match(html(`${body}\n- m\n`), /<\/blockquote>\n<ul>\n {2}<li>m<\/li>\n<\/ul>/, body)
    }
  }
})

test('document and quote paragraphs keep the marker as text', () => {
  assert.equal(html('p\n- x\n'), '<p>p\n- x</p>')
  assert.equal(html('> p\n- x\n'), '<blockquote><p>p\n- x</p></blockquote>')
  assert.equal(html('> p\n> - x\n'), '<blockquote><p>p\n- x</p></blockquote>')
  assert.equal(html('> > p\n> - x\n'), '<blockquote>\n  <blockquote><p>p\n- x</p></blockquote>\n</blockquote>')
})

test('an accepted + is read first', () => {
  assert.equal(html(':: t\n: d\n+\n- x\n'), html(':: t\n: d\n\n  - x\n'))
})
