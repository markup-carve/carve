import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830: a short continuation refuses only the opener.
const render = source => renderDoc(parse(source))
const oracle = source => render(source.replace('{', '\\{'))

for (const [name, prefix, body] of [
  ['marker line', '- {.x\n }\n', '  '],
  ['item body', '- p\n  {.x\n }\n', '  '],
  ['nested marker line', '- p\n  - {.x\n   }\n', '    '],
  ['ordered marker line', '1. {.x\n  }\n', '   '],
]) {
  for (const follower of ['- q', '# h', '> q', '```', '::: note']) {
    test(`${name}: ${follower} follows the literal opener`, () => {
      const source = `${prefix}${body}${follower}\n`
      assert.equal(render(source), oracle(source))
    })
  }
}

for (const source of [
  '- {.x\n }\n  ```\nplain\n',
  '- {.x\n }\n  ```\n  # h\n  ```\n',
  '- {.x\n }\n   q\n',
]) test('the follower follows its own block rule', () => assert.equal(render(source), oracle(source)))
