import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('an own-line plus leaves an unclosed note fence open through its trailing blank', () => {
  for (const fence of ['```', '~~~']) {
    for (const payload of ['code', 'code\n\n  tail']) {
      const source = `[^a]: p\n+\n${fence}\n${payload}\n\nsee[^a]\n`
      const html = renderDoc(parse(source))
      assert.ok(html.includes(`<pre><code>${payload}\n\n</code></pre>`), source)
    }
  }
})
