import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a description at a missed item marker ends the item in the trace (carve#5360)', () => {
  const source = '- x\n  1. > +\n      :: t\n      : d\n  : z\n'
  assert.deepEqual(modelTrace(source).at(-1), {
    line: 5, step: 'S5', owner: 'doc/item:1', rule: 'CARVE-P0-024', form: 'text',
    closed: 2, reached: 'doc/item:1',
  })
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li>x\n    <ol>\n      <li>\n        <blockquote>\n\n' +
    '        </blockquote>\n        <dl>\n          <dt>t</dt>\n          <dd>d</dd>\n' +
    '        </dl>\n      </li>\n    </ol>\n    : z\n  </li>\n</ul>')
})

test('1,000 marker-column description variants close the missed inner item (carve#5360)', () => {
  let count = 0
  for (const outer of ['-', '*', '1.', '2.'])
    for (const inner of ['1.', '2.', '*', '-'])
      for (const term of ['t', 'term', 'word', 'entry', 'label'])
        for (const tail of ['z', 'more', 'body', 'last', 'item', 'end', 'text', 'other', 'next', 'value', 'done', 'final', 'alpha']) {
          if (count === 1000) break
          const markerColumn = outer.length + 1
          const content = markerColumn + inner.length + 1
          const source = `${outer} x\n${' '.repeat(markerColumn)}${inner} > +\n${' '.repeat(content + 1)}:: ${term}\n${' '.repeat(content + 1)}: d\n${' '.repeat(markerColumn)}: ${tail}\n`
          const last = modelTrace(source).at(-1)
          assert.equal(last.step, 'S5', source)
          assert.equal(last.owner, 'doc/item:1', source)
          assert.equal(last.form, 'text', source)
          count++
        }
  assert.equal(count, 1000)
})
