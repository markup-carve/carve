import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const code = source => renderDoc(parse(source)).match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)?.[1]

for (const [name, source, expected] of [
  // The box closer does not end the unclosed fence; it is payload (carve#4018).
  ['box', '- ::: box\n     ```\n    x\n     y\n  :::\nafter\n', 'x\ny\n:::\n'],
  ['note', '- ::: note\n     ```\n    x\n     y\n  :::\nafter\n', 'x\ny\n:::\n'],
  ['quoted box', '> - ::: box\n>      ```\n>     x\n>      y\n>   :::\nafter\n', 'x\ny\n:::\n'],
  ['right of base', '- ::: box\n     ```\n       z\n  :::\nafter\n', '  z\n:::\n'],
  ['box column', '- ::: box\n  ```\n x\n  y\n  :::\nafter\n', ''],
  ['definition body', ':: t\n: x\n\n     ```\n    a\n     b\n     ```\n', 'a\nb\n'],
  ['definition closer left of base', ':: t\n: x\n\n     ```\n     a\n   ```\nafter\n', 'a\n'],
]) test(`${name} measures code payload from its opener`, () => {
  assert.equal(code(source), expected)
})
