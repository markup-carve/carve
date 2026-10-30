import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

// CARVE-P9-067: a comment or link definition at a marker body's content
// column is its one block, so the next column-0 line is not the body's
// (carve#4307). One at column 0 is not the body's and leaves the `+` open.
const heads = ['- +', '* +', '1. +', '- [ ] +', '- a\n  * +', '- a\n  1. +', '> - a\n>   * +']
const invisibles = ['%% c', '%%% c', '[r]: /u', '%% c\n%% d']

for (const head of heads) {
  const lines = head.split('\n')
  const quote = lines[0].startsWith('> ') ? '> ' : ''
  const last = lines.at(-1).slice(quote.length)
  const content = last.length - 1
  const at = (text, col) => text.split('\n').map(l => quote + ' '.repeat(col) + l).join('\n')
  for (const invisible of invisibles) {
    test(`${JSON.stringify(head)} + ${JSON.stringify(invisible)} at the content column spends the +`, () => {
      const spent = html(`${head}\n${at(invisible, content)}\n${at('after', 0)}\n`)
      assert.equal(spent, html(`${head}\n${quote.trim()}\n${at('after', 0)}\n`))
    })
  }
}

test('a column-0 link definition leaves a nested + open for the next block', () => {
  assert.equal(html('- a\n  * +\n[r]: /u\n  after\n'), html('- a\n  * +\n  after\n'))
})

test('a column-0 line comment leaves a nested + open for the next block', () => {
  assert.equal(html('- a\n  * +\n%% c\n  after\n'), html('- a\n  * +\n  after\n'))
})
