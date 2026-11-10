import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830: a refused brace opener claims no fence follower.
const html = source => renderDoc(parse(source))
const oracle = source => html(source.replace('{', '\\{'))

for (const [name, prefix, suffix] of [
  ['note', '[^a]: +\n', '\n\nsee[^a]\n'],
  ['description', ':: t\n: +\n', '\n'],
  ['item', '- +\n', '\n'],
  ['root', '', '\n'],
]) test(`an unclosed fence after a refused opener in a ${name}`, () => {
  const source = `${prefix}{.x\n.y}\n\`\`\`\nwa${suffix}`
  assert.equal(html(source), oracle(source))
})

for (const source of [
  '  [^a]: +\n  {.x\n  .y}\n  ```\n  wa\n\nsee[^a]\n',
  '- +\n{.x\n.y}\n```\nwa\n# h\n',
  '[^a]: +\n{.x\n.y}\n```\nwa\n- li\n\nsee[^a]\n',
  ':: t\n: +\n{.x\n.y}\n```\nwa\n- li\n',
  '{.x\n.y}\n```\nwa\n- li\n',
  '[^a]: +\n{.x\n.y}\n```\nwa\n# h\n```\n\nsee[^a]\n',
]) test('the following line follows its own fence and owner rules', () => {
  assert.equal(html(source), oracle(source), source)
})
