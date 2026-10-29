import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

// A fence beside a marker-line note opens without a closer and the below-column
// line ends it; the later run opens a fence of its own (carve#4018).
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
    assert.deepEqual(blocks[1].lines, ['out'])
    assert.equal(blocks[2].t, 'code')
    assert.match(blocks[2].text, /^after \[\^n\]\n/)
    assert.deepEqual(doc.footnoteDefs.get('n').map((block) => block.t), ['para'])
  })
  test(`a fence under the note paragraph opens in the note, ${marker.trim()} item, quote depth ${q.length / 2}, ${run}`, () => {
    const body = ' '.repeat(column + 2)
    const doc = parse(at([`${marker}[^n]: text`, body + '- child', body + '  ' + run, body + '  code', 'outside', body + '  ' + run, 'after [^n]']))
    assert.deepEqual(doc.footnoteDefs.get('n').map((block) => block.t), ['para', 'code'])
    const blocks = owner(doc)
    const para = blocks.findIndex((block) => block.t === 'para')
    assert.deepEqual(blocks[para].lines, ['outside'])
    assert.equal(blocks[para + 1].t, 'code')
    assert.match(blocks[para + 1].text, /^after \[\^n\]\n/)
  })
}
