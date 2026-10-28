import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

const tightness = (source) => parse(source).blocks[0].tight

for (const fence of ['~~~', '```', '````', '``` js']) {
  test(`a note-claimed ${fence} line keeps the separation before a second paragraph`, () => {
    const lines = ['- item', '  [^c]: [^d]: para', '          more', `   ${fence}`, '', '  See[^c][^d]', '']
    assert.equal(tightness(lines.join('\n')), false)
    lines[3] = '   text'
    assert.equal(tightness(lines.join('\n')), false)
  })
}

test('a note-claimed fence line does not swallow a following sibling', () => {
  const doc = parse('- item\n  [^c]: para\n   ~~~\n- sib\n')
  assert.equal(doc.blocks[0].items.length, 2)
  assert.equal(doc.blocks[0].tight, true)
})
