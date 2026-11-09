import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const fence of ['```', '~~~']) for (const closerIndent of [' ', '  ', '   ']) {
  for (const interruption of ['> q', '# h', '- item', '|= H |']) {
    test(`carve#5600: ${fence}, closer at column ${closerIndent.length}, ${interruption}`, () => {
      const source = `{.x\n.y}\n${fence}\nwa\n${interruption}\n${closerIndent}${fence}\n`
      const out = html(source)
      assert.ok(out.startsWith('<p>{.x\n.y}'), out)
      assert.ok(out.endsWith('</p>'), out)
      assert.ok(out.includes(interruption === '> q' ? '&gt; q' : interruption), out)
      assert.doesNotMatch(out, /<blockquote>|<section|<ul>|<table>/)
    })
  }
}

test('carve#5600: a following block opens after the protected closer', () => {
  const out = html('{.x\n.y}\n```\nwa\n> q\n  ```\n# next\n')
  assert.match(out, /^<p>\{\.x\n\.y\}\n<code>\nwa\n&gt; q\n<\/code><\/p>\n<section id="next">/)
})
