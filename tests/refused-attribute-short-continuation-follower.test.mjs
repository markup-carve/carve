import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

for (const [name, prefix, body] of [
  ['marker line', '- {.x\n }\n', '  '],
  ['item body', '- p\n  {.x\n }\n', '  '],
  ['nested marker line', '- p\n  - {.x\n   }\n', '    '],
  ['ordered marker line', '1. {.x\n  }\n', '   '],
]) {
  for (const [follower, forbidden] of [
    ['- q', /<ul>\n\s*<li>q/],
    ['# h', /<h1/],
    ['> q', /<blockquote/],
    ['```', /<pre/],
    ['::: note', /<aside/],
  ]) {
    test(`${name}: ${follower} stays in the refused run's paragraph`, () => {
      const output = render(`${prefix}${body}${follower}\n`)
      assert.doesNotMatch(output, forbidden)
      assert.match(output, /\{\.x\n\}/)
    })
  }
}

test('an unclosed fence follower keeps its payload as inline code', () => {
  assert.equal(render('- {.x\n }\n  ```\nplain\n'), [
    '<ul>',
    '  <li>{.x',
    '}',
    '<code>\nplain</code></li>',
    '</ul>',
  ].join('\n'))
})

test('a closed fence follower keeps its payload and closer in the paragraph', () => {
  assert.equal(render('- {.x\n }\n  ```\n  # h\n  ```\n'), [
    '<ul>',
    '  <li>{.x',
    '}',
    '<code>\n# h\n</code></li>',
    '</ul>',
  ].join('\n'))
})

test('a prose follower keeps normal paragraph indentation', () => {
  assert.equal(render('- {.x\n }\n   q\n'), '<ul>\n  <li>{.x\n}\nq</li>\n</ul>')
})
