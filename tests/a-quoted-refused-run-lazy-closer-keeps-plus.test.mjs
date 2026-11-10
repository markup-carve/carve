import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035 with the carve#5619 ruling: a lazy closer without the quote
// prefixes is measured at its written column, so a quoted run it refuses
// keeps its marker-column `+` follower as text (carve#5658 R03).
const html = (s) => renderDoc(parse(s))
const flat = (h) => h.replace(/\s+/g, ' ').replace(/> </g, '><').trim()

test('a quoted refused run with a lazy closer keeps its + follower as text', () => {
  assert.equal(html('> - {.x\n}\n> +\nz\n'),
    '<blockquote>\n  <ul>\n    <li>{.x\n}\n+\nz</li>\n  </ul>\n</blockquote>')
})

const hosts = [['- ', ''], ['1. ', ''], [':: t\n: ', ''], ['[^1]: ', '\n\nx[^1]\n']]
const runs = [['{.x', ['}', ' }', '  }', '.y}']], ['{#i', ['}', '  }']], ['{% a', ['%}', '  %}']]]
for (const [host, end] of hosts) {
  for (const [open, closers] of runs) {
    for (const close of closers) {
      for (const depth of [1, 2]) {
        const q = '> '.repeat(depth)
        const head = q + host.replace('\n', '\n' + q) + open
        const quoted = `${head}\n${q}${close}\n${q}+\n${q}z\n${end}`
        const lazy = `${head}\n${close}\n${q}+\n${q}z\n${end}`
        test(`${JSON.stringify(lazy)} reads as its quoted twin`, () => {
          const out = html(lazy)
          assert.ok(!out.includes('%%'), out)
          assert.equal(flat(out), flat(html(quoted)))
          assert.ok(flat(out).includes('+ z'), out)
        })
      }
    }
  }
}
