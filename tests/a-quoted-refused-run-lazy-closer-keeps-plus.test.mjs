import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830: a missing quote prefix refuses the opener.
const html = source => renderDoc(parse(source))
const escaped = source => source.replace('{', '\\{')

const hosts = [['- ', ''], ['1. ', ''], [':: t\n: ', ''], ['[^1]: ', '\n\nx[^1]\n']]
const runs = [['{.x', ['}', ' }', '  }', '.y}']], ['{#i', ['}', '  }']], ['{% a', ['%}', '  %}']]]
for (const [host, end] of hosts) {
  for (const [open, closers] of runs) {
    for (const close of closers) {
      for (const depth of [1, 2]) {
        const q = '> '.repeat(depth)
        const head = q + host.replace('\n', '\n' + q) + open
        const lazy = `${head}\n${close}\n${q}+\n${q}z\n${end}`
        test(`${JSON.stringify(lazy)} reads after its literal brace opener`, () => {
          assert.equal(html(lazy), html(escaped(lazy)))
        })
      }
    }
  }
}
