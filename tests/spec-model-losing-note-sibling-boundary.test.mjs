import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a losing note plus leaves later lower-column siblings outside the winning note', () => {
  for (const first of ['- item', '- item\n    - sub', '1. item', '> quote']) {
    for (const sibling of ['- sibling', '1. sibling', '> sibling', ':: sibling\n: body']) {
      const tail = `  ${first.replaceAll('\n', '\n  ')}\n${sibling}\n\nsee[^n]\n`
      const winning = `[^n]: +\n${tail}`
      const losing = `[^n]: +\n[^n]: +\n${tail}`
      assert.equal(renderDoc(parse(losing)), renderDoc(parse(winning)), `${first} then ${sibling}`)
    }
  }
})
