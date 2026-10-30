import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// An item's first-block `+` takes a block at its marker column (carve#4409). The
// ownership walk records that block inside the item, as the readers attach it.
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a marker-column fence below a nested first-block item is traced in that item', () => {
  const source = '- foo\n  - +\n  ```\n  x\n  ```\n'
  assert.deepEqual(steps(source), [
    '1 S5 doc/item:1 item',
    '2 S5 doc/item:1/item:2 item',
    '3 S5 doc/item:1/item:2/code:3 code',
    '4 S1 doc/item:1/item:2/code:3 payload',
    '5 S1 doc/item:1/item:2/code:3 closer',
  ])
})

test('an attached fence records the + line it followed', () => {
  assert.equal(modelTrace('- foo\n  - +\n  ```\n  x\n  ```\n')[2].plus, 2)
})

test('a column-zero fence is refused and traced in the document', () => {
  assert.deepEqual(steps('- foo\n  - +\n```\nx\n```\n').slice(2), ['3 S5 doc/code:3 code', '4 S1 doc/code:3 payload', '5 S1 doc/code:3 closer'])
})

test('a marker-column quote and paragraph are traced in the item', () => {
  assert.equal(steps('- foo\n  - +\n  > b\n').at(-1), '3 S5 doc/item:1/item:2/quote:3 quote')
  assert.equal(steps('- foo\n  - +\n  para\n').at(-1), '3 S5 doc/item:1/item:2 text')
})

test('a column-zero quote and paragraph are refused', () => {
  assert.equal(steps('- foo\n  - +\n> b\n').at(-1), '3 S5 doc/quote:3 quote')
  assert.equal(steps('- foo\n  - +\npara\n').at(-1), '3 S4 doc/item:1/item:2 lazy')
})

test('an unclosed marker-column fence still ends at its block', () => {
  const source = '- foo\n  - +\n  ```\n  x\n\n    after\n'
  assert.deepEqual(steps(source).slice(2, 4), ['3 S5 doc/item:1/item:2/code:3 code', '4 S1 doc/item:1/item:2/code:3 payload'])
})

test('a body stacked on its parent marker line keeps its reading', () => {
  assert.equal(steps('- - +\n```\nx\n```\n')[1], '2 S5 doc/code:2 code')
})

test('a marker-column block is traced in the item and leaves no +, a column-zero one is refused', () => {
  const hosts = [['- foo\n', '  - +', 2], ['- foo\n', '  1. +', 2], ['- a\n  - b\n', '    - [ ] +', 4]]
  const blocks = [['```', 'x', '```'], ['> q'], ['# h'], ['para', 'more'], ['| a |'], ['::: note', 'x', ':::'], ['***'], ['{#i}', 'para']]
  let n = 0
  for (const [outer, host, marker] of hosts) {
    for (const block of blocks) for (const tail of ['', '\n', 'tail\n']) {
      const at = (c) => block.map((l) => ' '.repeat(c) + l).join('\n') + '\n'
      const source = `${outer}${host}\n${at(marker)}${tail}`
      const trace = modelTrace(source)
      const hostLine = outer.split('\n').length
      const hostPath = trace[hostLine - 1].owner
      const owner = trace[hostLine].owner
      assert.ok(owner === hostPath || owner.startsWith(`${hostPath}/`), `${JSON.stringify(source)}: ${owner}`)
      if (tail === '') {
        assert.doesNotMatch(renderDoc(parse(source)), /\+/, JSON.stringify(source))
        const refused = `${outer}${host}\n${at(0)}`
        assert.equal(renderDoc(parse(refused)), renderDoc(parse(refused.replace('+', 'z'))).replaceAll('z', '+'), JSON.stringify(refused))
      }
      n++
    }
  }
  assert.equal(n, 72)
})
