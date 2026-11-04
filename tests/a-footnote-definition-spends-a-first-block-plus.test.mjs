/*
 * A footnote definition at a `+` body's content column is a line the item
 * keeps, so the `+` skips it and a fence at the marker column attaches
 * (carve#5130, which replaced carve#4347). Below an inner item's marker column
 * the fence still ends the item (carve#4409).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the reported shape', () => {
  assert.equal(html('- +\n  [^n]: x\n```\nz\n```\n'), '<ul>\n  <li>\n    <pre><code>z\n</code></pre>\n  </li>\n</ul>')
})

test('the nested spelling', () => {
  assert.equal(html('- a\n  * +\n    [^n]: x\n```\nz\n```\n'), '<ul>\n  <li>a\n    <ul>\n      <li></li>\n    </ul>\n  </li>\n</ul>\n<pre><code>z\n</code></pre>')
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
        // `[^n]:` with nothing after it is paragraph text, not a definition.
        if (head.includes('\n') || def.startsWith('[^n]:\n')) assert.ok(out.includes(`</ul>\n${own}`) || out.includes(`</ol>\n${own}`), out)
        else assert.ok(out.indexOf(own) !== -1 && out.indexOf(own) < out.indexOf('</li>'), out)
      })
    }
