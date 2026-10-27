import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('an outer item follower leaves each nested fence blank in its payload', () => {
  for (const run of ['```', '~~~']) {
    for (const tail of ['tail', '# tail']) {
      const source = `- - ${run}\n\n\n  ${tail}\n`
      const rendered = html(source)
      assert.ok(rendered.includes('<pre><code>\n\n</code></pre>'), rendered)
      assert.ok(rendered.includes(tail === 'tail' ? '<p>tail</p>' : '<h1 id="tail">tail</h1>'), rendered)
    }
  }
})
