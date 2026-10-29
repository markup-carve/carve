import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const shapes = [
  ['marker-line quoted fence', '- > ```\n  > x\n  > ```'],
  ['unclosed quoted fence', '- intro\n  > ```'],
  ['nested heading after comment', '- - intro\n  %% c\n    # h'],
]
// A footnote body takes a lazy line like every container (carve#3885).
const noteShapes = [
  ['nested quoted footnote', '- > - - x\n  >     [^f]: note'],
  ['marker-line note', '- [^f]: note'],
]
for (const depth of [0, 1, 2]) {
  const quote = '> '.repeat(depth)
  const wrap = source => source.split('\n').map(line => quote + line).join('\n') + '\n'
  for (const [name, source] of shapes) {
    test(`${name} releases a flush-left line at quote depth ${depth}`, () => {
      const prefix = wrap(source)
      assert.equal(renderDoc(parse(prefix + 'tail\n')), renderDoc({ ...parse(prefix), blocks: [...parse(prefix).blocks, ...parse('tail\n').blocks] }))
      assert.deepEqual(parse(prefix + 'tail\n').blocks, [...parse(prefix).blocks, ...parse('tail\n').blocks])
    })
  }
  for (const fence of ['```', '```=html', '~~~']) for (const closed of [false, true]) {
    test(`marker-line ${fence}, closed ${closed}, matches body quote at depth ${depth}`, () => {
      const body = `> ${fence}\n> x` + (closed ? '\n> ' + fence : '')
      const marker = wrap('- ' + body.replaceAll('\n', '\n  '))
      const follower = wrap('- intro\n  ' + body.replaceAll('\n', '\n  '))
      for (const prefix of [marker, follower]) {
        assert.equal(renderDoc(parse(prefix + 'tail\n')), renderDoc({ ...parse(prefix), blocks: [...parse(prefix).blocks, ...parse('tail\n').blocks] }))
      }
    })
  }
  test(`marker-line term matches direct quote at depth ${depth}`, () => {
    for (const prefix of [wrap('- > :: term'), wrap('> :: term')]) {
      assert.match(renderDoc(parse(prefix + 'tail\n')), /<dt>term\ntail<\/dt>/)
    }
  })
  test(`comment before heading matches a heading at the outer item column at depth ${depth}`, () => {
    assert.equal(renderDoc(parse(wrap(shapes[2][1]) + 'tail\n')), renderDoc(parse(wrap('- - intro\n  # h') + 'tail\n')))
  })
  for (const [name, source] of noteShapes) {
    test(`a ${name} takes a flush-left line at quote depth ${depth}`, () => {
      const prefix = wrap(source)
      const doc = parse(prefix + 'tail\n')
      assert.deepEqual(doc.blocks, parse(prefix).blocks)
      assert.deepEqual(doc.footnoteDefs.get('f')[0].lines.map((line) => line.replace(/^\u0000L\u0000/, '')), ['note', 'tail'])
    })
  }
}
