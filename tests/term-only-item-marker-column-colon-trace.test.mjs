import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a marker-column `: ` line after an ended term-only list is traced as lazy (carve#5368)', () => {
  const source = '- a\n  :: m\n\n  para\n: l\n'
  assert.deepEqual(modelTrace(source).at(-1),
    { line: 5, step: 'S4', owner: 'doc/item:1', rule: 'CARVE-P0-006', form: 'lazy', reached: 'doc' })
  assert.match(render(source), /<p>para\n: l<\/p>\n  <\/li>\n<\/ul>$/)
})

test('a term-only item holds the boundary only until a later block ends its list (carve#5368)', () => {
  let count = 0
  for (const host of ['- a', '1. a', '* a'])
    for (const after of [[], [''], ['', 'para'], ['w'], ['# H', 'w'], ['---', 'w'], ['', 'para', 'more']]) {
      const ind = host.startsWith('1.') ? '   ' : '  '
      const lines = [host, `${ind}:: m`, ...after.map((l) => (l ? ind + l : l)), ': l']
      const source = lines.join('\n') + '\n'
      const stillOpen = after.length === 0 || after.length === 1 && after[0] === ''
      if (stillOpen) {
        assert.match(render(source), /<\/[uo]l>\n<p>: l<\/p>$/, source)
        assert.equal(modelTrace(source).at(-1).owner, 'doc', source)
      } else {
        assert.match(render(source), /: l(?:<\/p>)?\n  <\/li>\n<\/[uo]l>$/, source)
        assert.equal(modelTrace(source).at(-1).form, 'lazy', source)
      }
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

test('a quote before the term leaves its later paragraph lazy (carve#5368)', () => {
  const source = '- a\n  > q\n  :: t\n  w\n: l\n'
  assert.match(render(source), /w\n: l\n  <\/li>\n<\/ul>$/)
  assert.equal(modelTrace(source).at(-1).form, 'lazy')
  assert.match(render('- a\n  > q\n  :: t\n  : d\n\n  w\n: l\n'), /<p>w\n: l<\/p>/)
})
