import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a shifted marker inside an attached quote fence stays payload', () => {
  for (const host of ['- +\n', ':: term\n: +\n']) {
    const actual = html(`${host}> \`\`\`\n  > code\n> \`\`\`\n`)
    assert.match(actual, /<blockquote>\n\s*<pre><code>code\n<\/code><\/pre>\n\s*<\/blockquote>/)
    assert.equal((actual.match(/<blockquote>/g) ?? []).length, 1)
  }
})
