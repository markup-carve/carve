import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

for (const fence of ['```', '~~~']) for (const closerIndent of [' ', '  ', '   ']) {
  for (const interruption of ['> q', '# h', '- item', '|= H |']) {
    test(`carve#5600 superseded: ${fence}, closer at column ${closerIndent.length}, ${interruption}`, () => {
      const source = `{.x\n.y}\n${fence}\nwa\n${interruption}\n${closerIndent}${fence}\n`
      assert.equal(html(source), html(source.replace('{', '\\{')))
    })
  }
}

test('a block after the fence is read normally', () => {
  const source = '{.x\n.y}\n```\nwa\n> q\n  ```\n# next\n'
  assert.equal(html(source), html(source.replace('{', '\\{')))
})
