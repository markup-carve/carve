import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))
const FENCE = '`'.repeat(3)

// carve#4399: an attribute line leads the block; it does not change how the block's lines are read.
test('an attribute line leaves a nested + attached fence as its twin reads it', () => {
  const hosts = ['- a\n  - +', '- a\n  - b\n    - +', '- :: t\n  : +', '- - +']
  for (const host of hosts) {
    for (const line of ['  x', '    x', ` ${FENCE}`, `  ${FENCE}`, `\t${FENCE}`]) {
      const plain = `${host}\n${FENCE}\n${line}\nz\n`
      const attributed = `${host}\n{.c}\n${FENCE}\n${line}\nz\n`
      assert.equal(render(attributed).replace('<pre class="c">', '<pre>'), render(plain), attributed)
    }
  }
})
