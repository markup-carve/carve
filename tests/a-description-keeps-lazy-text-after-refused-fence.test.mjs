import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830 supersedes the refused-fence follower readings.
const html = source => renderDoc(parse(source)).trim()
const oracle = source => html(source.replace('{', '\\{'))

for (const fence of ['```', '~~~']) for (const lead of ['{.x', '{#id']) {
  test('a description reads a fence after a refused opener normally', () => {
    const source = `:: term\n: ${lead}\n  }\n  ${fence}\nplain\n`
    assert.equal(html(source), oracle(source))
  })
}

for (const source of [
  ':: t\n: - a\n    {.x\n    }\n  ```\nplain\n',
  ':: t\n: - a\n  {.x\n  }\n  ```\nplain\n',
  ':: t\n: - - a\n      {.x\n      }\n    ```\nplain\n',
]) test('a nested description reads the following fence normally', () => {
  assert.equal(html(source), oracle(source))
})
