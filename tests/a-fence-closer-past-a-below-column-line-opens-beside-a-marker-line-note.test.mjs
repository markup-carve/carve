import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

// CARVE-P0-014: the closer lookahead searches past a below-column line, so a
// fence beside a marker-line note opens and that line ends it (carve#3910).
const F = '`'.repeat(3)
for (const q of ['', '> ', '> > ']) for (const [marker, column] of [['- ', 2], ['1. ', 3], ['* ', 2]]) for (const run of [F, '~~~']) {
  const at = (lines) => lines.map((line) => q + line).join('\n') + '\n\nr[^n]\n'
  const owner = (doc) => {
    let blocks = doc.blocks
    for (let depth = 0; depth < q.length / 2; depth++) blocks = blocks[0].children
    return blocks
  }
  test(`a fence at the item column opens in the ${marker.trim()} item, quote depth ${q.length / 2}, ${run}`, () => {
    const pad = ' '.repeat(column)
    const doc = parse(at([`${marker}[^n]: text`, pad + run, pad + 'code', 'out', pad + run, 'after [^n]']))
    const blocks = owner(doc)
    assert.deepEqual(blocks[0].items[0].blocks.map((block) => block.t), ['code'])
    assert.deepEqual(blocks[1].lines, ['out', run, 'after [^n]'])
    assert.deepEqual(doc.footnoteDefs.get('n').map((block) => block.t), ['para'])
  })
  test(`a fence under the note paragraph opens in the note, ${marker.trim()} item, quote depth ${q.length / 2}, ${run}`, () => {
    const body = ' '.repeat(column + 2)
    const doc = parse(at([`${marker}[^n]: text`, body + '- child', body + '  ' + run, body + '  code', 'outside', body + '  ' + run, 'after [^n]']))
    assert.deepEqual(doc.footnoteDefs.get('n').map((block) => block.t), ['para', 'code'])
    assert.deepEqual(owner(doc).at(q ? -1 : -2).lines, ['outside', run, 'after [^n]'])
  })
}
