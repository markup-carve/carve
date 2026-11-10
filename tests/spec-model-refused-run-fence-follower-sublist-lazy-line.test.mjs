import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830 supersedes carve#5610's follower protection.
const render = source => renderDoc(parse(source))
const oracle = source => render(source.replace('{', '\\{'))

for (const source of [
  '- +\n  {.x\n  .y}\n  ```\n  - li\ntail\n',
  ...[
    ['- +\n', '  '],
    ['1. +\n', '   '],
    ['- a\n', '  '],
  ].flatMap(([head, pad]) => ['```', '````', '~~~'].map(run =>
    `${head}${pad}{.x\n${pad}.y}\n${pad}${run}\n${pad}- li\ntail\n`)),
  '{.x\n.y}\n```\nwa\n- li\ntail\n',
  '- - a\n    {.x\n    .y}\n    ```\n   ```\ntail\n',
  '- - +\n    {.x\n    .y}\n    ```\n   ```\ntail\n',
  '> - +\n>   {.x\n>   .y}\n>   ```\n>  ```\ntail\n',
]) test('a refused opener does not protect a fence or sublist follower', () => {
  assert.equal(render(source), oracle(source), source)
})
