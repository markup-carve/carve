import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// An item's first-block `+` below an indented marker also
// takes a block at column zero (PART 9 §17 L3 and L4, CARVE-P9-067, corpus 633).
// The ownership walk records that block inside the item, as the readers attach it.
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a column-zero fence below a nested first-block item is traced in that item', () => {
  const source = '- foo\n  - +\n```\nx\n```\n'
  assert.deepEqual(steps(source), [
    '1 S5 doc/item:1 item',
    '2 S5 doc/item:1/item:2 item',
    '3 S5 doc/item:1/item:2/code:3 code',
    '4 S1 doc/item:1/item:2/code:3 payload',
    '5 S1 doc/item:1/item:2/code:3 closer',
  ])
  assert.equal(modelTrace(source)[2].plus, 2)
})

test('a column-zero quote and paragraph are traced in the item', () => {
  assert.equal(steps('- foo\n  - +\n> b\n').at(-1), '3 S5 doc/item:1/item:2/quote:3 quote')
  assert.equal(steps('- foo\n  - +\npara\n').at(-1), '3 S5 doc/item:1/item:2 text')
})

test('an unclosed column-zero fence still ends at its block', () => {
  const source = '- foo\n  - +\n```\nx\n\n    after\n'
  assert.deepEqual(steps(source).slice(2, 4), ['3 S5 doc/item:1/item:2/code:3 code', '4 S1 doc/item:1/item:2/code:3 payload'])
  assert.match(renderDoc(parse(source)), /<li>\n {8}<pre><code>x\n<\/code><\/pre>\n {8}<p>after<\/p>\n {6}<\/li>/)
})

test('a body stacked on its parent marker line keeps its reading', () => {
  assert.equal(steps('- - +\n```\nx\n```\n')[1], '2 S5 doc/code:2 code')
})

test('a column-zero block renders as the same block written at the content column', () => {
  const hosts = [['- foo\n', '  - +', 2], ['- foo\n', '  1. +', 2], ['- a\n  - b\n', '    - [ ] +', 4]]
  const blocks = [['```', 'x', '```'], ['%%%', 'c', '%%%'], ['> q'], ['# h'], ['para', 'more'], ['| a |'], ['::: note', 'x', ':::'], ['***'], ['{#i}', 'para']]
  let n = 0
  for (const [outer, host, marker] of hosts) {
    const content = marker + host.trim().length - 1
    for (const block of blocks) for (const tail of ['', '\n', 'tail\n']) {
      const at = (c) => block.map((l) => ' '.repeat(c) + l).join('\n') + '\n'
      const source = `${outer}${host}\n${at(0)}${tail}`
      const trace = modelTrace(source)
      const hostLine = outer.split('\n').length
      const hostPath = trace[hostLine - 1].owner
      const owner = trace[hostLine].owner
      assert.ok(owner === hostPath || owner.startsWith(`${hostPath}/`), `${JSON.stringify(source)}: ${owner}`)
      if (tail === '') assert.equal(renderDoc(parse(source)), renderDoc(parse(`${outer}${host}\n${at(content)}`)), JSON.stringify(source))
      n++
    }
  }
  assert.equal(n, 81)
})
