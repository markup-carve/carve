import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

// carve#4409: a comment or link definition off the marker column refuses the `+` like any line.
const heads = ['- +', '* +', '1. +', '- [ ] +', '- a\n  * +', '- a\n  1. +', '> - a\n>   * +']
const invisibles = ['%% c', '%%% c', '[r]: /u', '%% c\n%% d']

for (const head of heads) {
  const lines = head.split('\n')
  const quote = lines[0].startsWith('> ') ? '> ' : ''
  const last = lines.at(-1).slice(quote.length)
  const content = last.length - 1
  const at = (text, col) => text.split('\n').map(l => quote + ' '.repeat(col) + l).join('\n')
  for (const invisible of invisibles) {
    test(`${JSON.stringify(head)} + ${JSON.stringify(invisible)} at the content column refuses the +`, () => {
      const spent = html(`${head}\n${at(invisible, content)}\n${at('after', 0)}\n`)
      assert.equal(spent, html(`${head}\n${quote.trim()}\n${at('after', 0)}\n`))
    })
  }
}

test('a column-0 link definition refuses a nested + and ends the item', () => {
  assert.equal(html('- a\n  * +\n[r]: /u\n  after\n'), html('- a\n  * x\n[r]: /u\n  after\n').replace('<li>x', '<li>+'))
})

test('a column-0 line comment refuses a nested + and ends the item', () => {
  assert.equal(html('- a\n  * +\n%% c\n  after\n'), html('- a\n  * x\n%% c\n  after\n').replace('<li>x', '<li>+'))
})
