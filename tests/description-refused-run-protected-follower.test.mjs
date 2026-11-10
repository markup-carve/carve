import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830 removes the protected follower rule.
const html = source => renderDoc(parse(source)).trim()
const oracle = source => html(source.replace('{', '\\{'))

for (const source of [
  ':: t\n: {.x\n}\n[^m]: n\nz',
  ':: t\n: {% c\n%}\n[^m]: n\nz',
  ':: t\n: {.x\n}\n# h\nz',
  ':: t\n: {.x\n}\n> q\nz',
  ':: t\n: {.x\n}\n- x\nz',
  ':: t\n: {.x\n}\n[^m]: n\nz\n: next',
  ':: t\n: {#id\n}\n[r]: /u\nz',
  ':: t\n: {.x\n}\n{.y\n}\n# h\nz',
  ':: t\n: {.x\n}\n```\n# h\n```\nz',
]) test('a refused description opener claims no follower', () => {
  assert.equal(html(source), oracle(source), source)
})
