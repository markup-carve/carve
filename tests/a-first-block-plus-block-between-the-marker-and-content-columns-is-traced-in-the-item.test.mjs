import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// carve#4147: between an item's marker and content columns its first-block `+`
// takes any block but a paragraph (CARVE-P9-067, corpus 633). The readers
// attach it; the decision trace recorded it in the parent.
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a fence between the marker and content columns is traced in the item', () => {
  const source = '- +\n ```\n x\n ```\n'
  assert.deepEqual(steps(source), [
    '1 S5 doc/item:1 item',
    '2 S5 doc/item:1/code:2 code',
    '3 S1 doc/item:1/code:2 payload',
    '4 S1 doc/item:1/code:2 closer',
  ])
  assert.equal(modelTrace(source)[1].plus, 1)
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li>\n    <pre><code>x\n</code></pre>\n  </li>\n</ul>')
})

test('a quote, heading and nested fence between the columns are traced in the item', () => {
  assert.deepEqual(steps('- +\n > q\n > r\n').slice(1), ['2 S5 doc/item:1/quote:2 quote', '3 S5 doc/item:1/quote:2 text'])
  assert.equal(steps('1. +\n  # h\n')[1], '2 S5 doc/item:1 leaf')
  assert.equal(steps('- a\n  - +\n   ```\n   x\n   ```\n')[2], '3 S5 doc/item:1/item:2/code:3 code')
})

test('a block between the columns is traced where the HTML puts it', () => {
  const hosts = [['', '- +', 0, 2], ['', '1. +', 0, 3], ['', '- [ ] +', 0, 6], ['- a\n', '  - +', 2, 4]]
  const blocks = [['```', 'x', '```'], ['%%%', 'c', '%%%'], ['> q'], ['# h'], ['| a |'], ['::: note', 'x', ':::'], ['***'], ['{#i}', 'para']]
  let n = 0
  for (const [outer, host, marker, content] of hosts) {
    for (let col = marker + 1; col < content; col++) for (const block of blocks) {
      const source = `${outer}${host}\n${block.map((l) => ' '.repeat(col) + l).join('\n')}\n`
      const trace = modelTrace(source)
      const hostLine = outer.split('\n').length
      const hostPath = trace[hostLine - 1].owner
      for (const record of trace.slice(hostLine)) {
        assert.ok(record.owner === hostPath || record.owner.startsWith(`${hostPath}/`), `${JSON.stringify(source)}: ${record.line} ${record.owner}`)
      }
      n++
    }
  }
  assert.equal(n, 72)
})
