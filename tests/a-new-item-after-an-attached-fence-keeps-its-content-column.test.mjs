import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a new list item owns a later line at its content column after an attached fence', () => {
  for (const prior of ['1.', '-', '*']) {
    for (const next of ['-', '*', '1.']) {
      if (next === prior) continue
      const source = `${prior} +\n\`\`\`\n${next} z\n\n${' '.repeat(next.length + 1)}y\n`
      const html = renderDoc(parse(source))
      assert.match(html, /<li><p>z<\/p>\s*<p>y<\/p>\s*<\/li>/, source)
      assert.doesNotMatch(html, /<p>y<\/p>\s*$/, source)
    }
  }
})

test('a marker inside a closed attached fence remains code payload', () => {
  const html = renderDoc(parse('- +\n```\n- z\n```\nq\n'))
  assert.match(html, /<pre><code>- z\n<\/code><\/pre>/)
  assert.doesNotMatch(html, /<li>z<\/li>/)
})
