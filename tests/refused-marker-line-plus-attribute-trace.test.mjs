import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('an attribute line after a refused marker-line `+` is traced at document level (carve#5370)', () => {
  assert.deepEqual(modelTrace('- +\n{x}\n  h\n').slice(1), [
    { line: 2, step: 'S5', owner: 'doc', rule: 'CARVE-P0-011', form: 'leaf', closed: 1, reached: 'doc' },
    { line: 3, step: 'S5', owner: 'doc', rule: 'CARVE-P0-024', form: 'text' },
  ])
  assert.equal(render('- +\n{x}\n  h\n'), '<ul>\n  <li></li>\n</ul>\n<p x="">h</p>')
})

test('the block after the attribute reads as it does after a closed item (carve#5370)', () => {
  let count = 0
  for (const host of ['- ', '1. ', '* ', '- [ ] '])
    for (const attrs of [['{x}'], ['{.c}'], ['{x}', '{y}'], ['{#i}']])
      for (const block of ['h', '# h', '> q', '- i', ':: t', '| a |'])
        for (const col of [1, 2, 3, 4, 6]) {
          const tail = attrs.join('\n') + '\n' + ' '.repeat(col) + block + '\n'
          const source = `${host}+\n${tail}`
          const closed = render(`${host}a\n${tail}`).replace(/^[\s\S]*?<\/[uo]l>/, '')
          assert.ok(render(source).endsWith(closed), source)
          count++
        }
  assert.equal(count, 480)
})
