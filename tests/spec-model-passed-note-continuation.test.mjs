import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

for (const [name, first, later] of [
  ['a loose list', '- a', '  - b'],
  ['a continuation marker', '- a', '  +\n  para'],
  ['an open fence', '```', '  more'],
]) {
  test(`a passed note reads ${name} as one body`, () => {
    const body = `[^k]: +\n  ${first}\n\n${later}\n\nsee[^k]\n`
    const wrapped = `[^n]: +\n${body.replace('see[^k]', 'see[^n][^k]')}`
    assert.deepEqual(parse(wrapped).footnoteDefs.get('k'), parse(body).footnoteDefs.get('k'))
  })
}
