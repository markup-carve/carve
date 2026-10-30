/*
 * A footnote definition at a `+` body's content column is that body's first
 * block, so a code fence below the column ends the item (carve#4347).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the reported shape', () => {
  assert.equal(html('- +\n  [^n]: x\n```\nz\n```\n'), '<ul>\n  <li></li>\n</ul>\n<pre><code>z\n</code></pre>')
})

test('the nested spelling', () => {
  assert.equal(html('- a\n  * +\n    [^n]: x\n```\nz\n```\n'),
    '<ul>\n  <li>a\n    <ul>\n      <li></li>\n    </ul>\n  </li>\n</ul>\n<pre><code>z\n</code></pre>')
})

const heads = [['- +', '  '], ['* +', '  '], ['1. +', '   '], ['- [ ] +', '      '], ['- a\n  * +', '    ']]
const defs = ['[^n]: x', '[^n]: x\n{IND}  y', '[^n]:\n{IND}  y', '[^n]: *x*']
const fences = ['```\nz\n```', '~~~\nz\n~~~', '``` js\nz\n```']
for (const [head, ind] of heads)
  for (const def of defs)
    for (const fence of fences) {
      const body = `${head}\n${ind}${def.replaceAll('{IND}', ind)}\n`
      const src = `${body}${fence}\n\nr[^n]\n`
      test(JSON.stringify(src), () => {
        const own = html(`${fence}\n`)
        const out = html(src)
        assert.ok(out.includes(`</ul>\n${own}`) || out.includes(`</ol>\n${own}`), out)
      })
    }
