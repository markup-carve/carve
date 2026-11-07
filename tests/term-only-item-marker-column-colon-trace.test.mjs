import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a marker-column `: ` line after a term-only list is traced where the HTML puts it (carve#5376)', () => {
  const source = '- a\n  :: m\n\n  para\n: l\n'
  assert.deepEqual(modelTrace(source).at(-1),
    { line: 5, step: 'S5', owner: 'doc', rule: 'CARVE-P0-024', form: 'text', closed: 1, reached: 'doc' })
  assert.match(render(source), /<p>para<\/p>\n  <\/li>\n<\/ul>\n<p>: l<\/p>$/)
})

test('a term-only item ends at a marker-column `: ` line in the trace too (carve#5376)', () => {
  let count = 0
  for (const host of ['- a', '1. a', '* a'])
    for (const after of [[], [''], ['', 'para'], ['w'], ['# H', 'w'], ['---', 'w'], ['', 'para', 'more']]) {
      const ind = host.startsWith('1.') ? '   ' : '  '
      const lines = [host, `${ind}:: m`, ...after.map((l) => (l ? ind + l : l)), ': l']
      const source = lines.join('\n') + '\n'
      assert.match(render(source), /<\/[uo]l>\n<p>: l<\/p>$/, source)
      assert.equal(modelTrace(source).at(-1).owner, 'doc', source)
      count++
    }
  assert.equal(count, 21)
})

test('a deeper quote or item after the term still takes the line lazily (carve#5376)', () => {
  for (const source of ['- a\n  :: t\n  > q\n: l\n', '- a\n  :: t\n  - i\n: l\n']) {
    assert.doesNotMatch(render(source), /<p>: l<\/p>/, source)
    assert.equal(modelTrace(source).at(-1).form, 'lazy', source)
  }
})
