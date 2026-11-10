import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()
const oracle = source => html(source.replace('{', '\\{'))

for (const follower of ['# h', '> q', '- li', '```\nwa\n```']) {
  test('an attached note reads the line after a refused opener normally', () => {
    const source = `[^a]: +\n{.x\n.y}\n${follower}\n\nsee[^a]\n`
    assert.equal(html(source), oracle(source))
  })
}

for (const follower of ['# h', '{.z}', ':: d', '| a |']) {
  test('plain text after a block-shaped follower is read normally', () => {
    const source = `r[^a]\n\n[^a]: +\n{.x\n.y}\n${follower}\nb\n`
    assert.equal(html(source), oracle(source))
  })
}

test('a nested note reads a marker after a refused opener normally', () => {
  const source = '- x\n  [^a]: +\n  {.x\n  .y}\n  - li\n\nsee[^a]\n'
  assert.equal(html(source), oracle(source))
})
