import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

const hosts = [
  ['- p', 2, '- ', 'ul'],
  ['1. p', 3, '1. ', 'ol'],
  ['- [ ] p', 6, '- [ ] ', 'ul'],
]
const middles = ['m', '- m', '1. m', '---', '# m', '> m', '| a |', '{.c}', '%% c', '::: x', '```']

for (const [head, col] of hosts) {
  for (const middle of middles) {
    for (const shift of [1, 2]) {
      for (const closer of ['z %}', '%}']) {
        test(`${head}: a comment run holding ${middle} at +${shift} is invisible (carve#5844)`, () => {
          const pad = ' '.repeat(col)
          const inner = pad + ' '.repeat(shift)
          const source = `${head}\n\n${pad}{% a\n${inner}${middle}\n${inner}${closer}\n`
          const output = html(source)
          // Comment payload renders nothing, so the item stays tight like the one-line run.
          assert.doesNotMatch(output, /<p>/, source)
          assert.doesNotMatch(output, /<li>[\s\S]*<(ul|ol|hr|h1|blockquote|table|div|pre)[\s>]/, source)
        })
      }
    }
  }
}

test('a refused run still reads its marker line normally', () => {
  const output = html('- p\n\n  {% a\n  - m\n  z %}\n')
  assert.match(output, /<li><p>p<\/p>/)
})
