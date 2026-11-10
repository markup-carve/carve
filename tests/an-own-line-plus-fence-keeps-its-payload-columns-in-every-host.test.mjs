import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Ruling A (carve#5855): an own-line `+` fence's payload is verbatim from the
// opener's column in every host; a blank does not re-measure the next line.
const hosts = {
  item: [['- p'], '', ''],
  'ordered item': [['1. p'], '', '', 3],
  note: [['[^a]: p'], '', '[^a]'],
  description: [[':: t', ': p'], '', ''],
  'nested item': [['- x', '', '  - p'], '  ', ''],
  'note in an item': [['- x', '', '  [^a]: p'], '  ', '[^a]'],
  'description in an item': [['- x', '', '  :: t', '  : p'], '  ', ''],
}
const code = (s) => [...s.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => m[1])
for (const [name, [head, pad, ref, body = 2]] of Object.entries(hosts)) for (const blanks of [1, 2]) for (let indent = body; indent <= 4; indent++) {
  test(`${name}: a payload line at ${indent} after ${blanks} blank(s) keeps its columns`, () => {
    const tail = ' '.repeat(indent) + 'tail'
    const lines = [...(ref ? [`r${ref}`, ''] : []), ...head, pad + '+', pad + '```', pad + 'code',
      ...Array(blanks).fill(''), pad + tail, '', 'see']
    const out = renderDoc(parse(lines.join('\n') + '\n'))
    assert.deepEqual(code(out), ['code\n' + '\n'.repeat(blanks) + tail + '\n\n'], out)
  })
}
