import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse as parseEngine, renderCarve } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const quoted = (source, depth) => source.split('\n').map(line => '> '.repeat(depth) + line).join('\n')
const contentColumn = marker => marker.startsWith('- [') ? 2 : marker.length
const itemAt = (source, depth) => {
  let blocks = parse(source).blocks
  for (let i = 0; i < depth; i++) blocks = blocks[0].children
  return blocks.find(block => block.t === 'list').items[0]
}

for (const marker of ['- ', '1. ', '- [ ] ']) {
  for (const depth of [0, 1, 2]) {
    for (const [opener, kind] of [
      ['> quote', 'quote'],
      ['# heading', 'heading'],
      ['```\nX\n```', 'code'],
    ]) {
      test(`an ended note leaves a ${kind} in the ${marker.trim()} item at quote depth ${depth}`, () => {
        const column = contentColumn(marker)
        const lines = [marker + 'a', ' '.repeat(column) + '[^n]: note',
          ' '.repeat(column + 1) + 'q',
          ...opener.split('\n').map(line => ' '.repeat(column + 2) + line)]
        const source = quoted(lines.join('\n'), depth) + '\n'
        const item = itemAt(source, depth)
        assert.deepEqual(item.blocks.map(block => block.t), ['para', kind])
        assert.deepEqual(parse(source).footnoteDefs.get('n')[0].lines, ['note', 'q'])
        assert.equal(renderDoc(parse(source)).includes('&gt; quote'), false)
      })
    }
  }
}

for (const marker of ['- ', '* ', '- [ ] ']) {
  for (const depth of [0, 1, 2]) {
    test(`a marker-line child ends before an outer term and quote: ${marker.trim()}, quote depth ${depth}`, () => {
      const column = contentColumn(marker)
      const lines = [marker + '1. ordered', ' '.repeat(column + 2) + ':: term',
        ' '.repeat(column + 2) + ':  detail', ' '.repeat(column + 4) + '> quote',
        ' '.repeat(column + 2) + 'q', ' '.repeat(column + 8) + '- item']
      const source = quoted(lines.join('\n'), depth) + '\n'
      const item = itemAt(source, depth)
      assert.deepEqual(item.blocks.map(block => block.t), ['list', 'deflist', 'quote'])
      assert.deepEqual(item.blocks[2].children[0].lines, ['quote', 'q', '- item'])
    })
  }
}

test('the note still owns a line that reaches its body column', () => {
  const item = itemAt('- a\n  [^n]: note\n    q\n    > quote\n', 0)
  assert.deepEqual(item.blocks.map(block => block.t), ['para'])
})

for (const [name, source] of [
  ['note', '- a\n  [^n]: note\n   q\n    > quote\n'],
  ['marker-line child', '- 1. ordered\n    :: term\n    :  detail\n      > quote\n  \tq\n          - item\n'],
]) {
  test(`${name} writer output keeps the model's block owners`, () => {
    const written = renderCarve(parseEngine(source))
    assert.equal(renderDoc(parse(written)), renderDoc(parse(source)))
  })
}
