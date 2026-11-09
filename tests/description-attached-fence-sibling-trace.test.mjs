import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a description-shaped line stays in an attached code fence until its boundary', () => {
  const source = ':: t\n: +\n```\na\n: dd\n'
  const trace = modelTrace(source)
  assert.equal(trace[4].form, 'payload')
  assert.equal(trace[4].owner, trace[3].owner)
  assert.match(renderDoc(parse(source)), /<pre><code>a\n: dd\n<\/code><\/pre>/)

  let count = 0
  for (const run of ['```', '~~~~', '````', '~~~~~']) {
    for (const payload of ['a', '  a', '- a', '# a', 'plain text']) {
      for (let n = 0; n < 10; n++) {
        for (const tail of ['', '\n', '\n\nq', '\n\n: next', '\n\n- next']) {
          const input = `:: t\n: +\n${run}\n${payload}\n: d${n}${tail}\n`
          const row = modelTrace(input)[4]
          assert.equal(row.form, 'payload', input)
          assert.equal(row.owner, 'doc/dd:2/code:3', input)
          count++
        }
      }
    }
  }
  assert.equal(count, 1000)
})

test('a description sibling after the closer or first unclosed blank opens normally', () => {
  for (const separator of ['```\n', '\n']) {
    const trace = modelTrace(`:: t\n: +\n\`\`\`\na\n${separator}: dd\n`)
    assert.equal(trace.at(-1).form, 'dd')
  }
})
