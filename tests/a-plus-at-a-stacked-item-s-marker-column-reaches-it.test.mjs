import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n[ \t]*/g, '').trim()

// carve#4355: an item stacked on its parent's marker line owns a `+` at its marker column.
test('the ticket reproduction', () => {
  assert.equal(html('- - +\n  +\n  x\n'), '<ul><li><ul><li>x</li></ul></li></ul>')
})

for (const [head, col] of [['- - ', 2], ['1. 1. ', 3], ['- 1. ', 2], ['1. - ', 3]]) {
  for (const prefix of ['', '> ', '> > ']) {
    for (const block of ['x', '# H', '> q', '---', '| a |']) {
      const at = ' '.repeat(col)
      const source = (first) => [`${head}${first}`, `${at}+`, `${at}${block}`].map((line) => prefix + line).join('\n') + '\n'
      test(`${JSON.stringify(source('+'))} attaches like the unstacked spelling`, () => {
        const bare = html(`${prefix}${head}+\n${prefix}${at}${block}\n`)
        const out = html(source('+'))
        assert.notEqual(out, bare)
        assert.equal(out, html([`${head.slice(0, col)}Q`, `${at}${head.slice(col)}+`, `${at}+`, `${at}${block}`].map((line) => prefix + line).join('\n') + '\n').replace('Q', ''))
      })
    }
  }
}

test('a + at the middle marker of a chain stops at the middle item', () => {
  assert.equal(html('- - - +\n  +\n  x\n'), '<ul><li><ul><li><ul><li></li></ul>x</li></ul></li></ul>')
  assert.equal(html('- - - +\n    +\n    x\n'), '<ul><li><ul><li><ul><li>x</li></ul></li></ul></li></ul>')
})
