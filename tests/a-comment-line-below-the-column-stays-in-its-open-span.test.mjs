import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const owners = (source) => {
  const trace = []
  parse(source, { trace })
  return trace.map((row) => `${row.line} ${row.owner} ${row.form}`)
}

test('the trace keeps a below-column comment line in the open span (carve#4994)', () => {
  assert.deepEqual(owners('- ::: box\n  %%%%\n %%%\n ```\n  %%%%\nz\n').slice(0, 3), [
    '1 doc/item:1/div:1 item',
    '2 doc/item:1/div:1/comment:2 comment',
    '3 doc/item:1/div:1/comment:2 payload',
  ])
  assert.deepEqual(owners('- ::: |\n  %%%\n %%%\n\n  %%%\nz\n'), [
    '1 doc/item:1/div:1 item',
    '2 doc/item:1/div:1 payload',
    '3 doc/item:1/div:1 payload',
    '4 doc/item:1/div:1 payload',
    '5 doc/item:1/div:1 payload',
    '6 doc text',
  ])
})

// A closer below the column ends the span as one at the column does (PART 9 §28).
test('a closer below the column reads like one at the column', () => {
  const hosts = [['- ', 2], ['1. ', 3], ['- - ', 4], ['- a\n  - ', 4]]
  let checked = 0
  for (const [first, col] of hosts) for (const run of ['%%%', '%%%%', '%%%%%']) for (let at = 0; at < col; at++) {
    for (const host of ['::: |', '::: box']) for (const tail of ['z', '# h', '- b']) {
      const body = ' '.repeat(col) + run
      const opened = [first + host, body, ' '.repeat(at) + run, '', body, tail].join('\n') + '\n'
      const atColumn = [first + host, body, body, '', body, tail].join('\n') + '\n'
      assert.equal(html(opened), html(atColumn), JSON.stringify(opened))
      checked++
    }
  }
  assert.equal(checked, 234)
})
