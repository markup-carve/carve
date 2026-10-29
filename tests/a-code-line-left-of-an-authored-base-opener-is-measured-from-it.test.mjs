import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const code = source => renderDoc(parse(source)).match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)?.[1]

// Each fence closes itself: an unclosed one would take the box closer too (carve#4018).
for (const [name, source, expected] of [
  ['box', '- ::: box\n     ```\n    x\n     y\n     ```\n  :::\nafter\n', 'x\ny\n'],
  ['note', '- ::: note\n     ```\n    x\n     y\n     ```\n  :::\nafter\n', 'x\ny\n'],
  ['quoted box', '> - ::: box\n>      ```\n>     x\n>      y\n>      ```\n>   :::\nafter\n', 'x\ny\n'],
  ['right of base', '- ::: box\n     ```\n       z\n     ```\n  :::\nafter\n', '  z\n'],
  ['box column', '- ::: box\n  ```\n x\n  y\n  :::\nafter\n', ''],
  ['definition body', ':: t\n: x\n\n     ```\n    a\n     b\n     ```\n', 'a\nb\n'],
  ['definition closer left of base', ':: t\n: x\n\n     ```\n     a\n   ```\nafter\n', 'a\n'],
]) test(`${name} measures code payload from its opener`, () => {
  assert.equal(code(source), expected)
})
