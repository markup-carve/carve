import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

for (const [label, follower, rendered] of [
  ['heading', '# h', '# h'],
  ['quote', '> q', '&gt; q'],
  ['list', '- li', '- li'],
]) {
  test(`a refused brace run keeps a ${label} follower in the attached note paragraph`, () => {
    const output = html(`[^a]: +\n{.x\n.y}\n${follower}\n\nsee[^a]\n`)
    assert.match(output, new RegExp(`<p>\\{\\.x\\n\\.y\\}\\n${rendered.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<a href=`))
    assert.doesNotMatch(output, /<h1|<blockquote|<ul>/)
  })
}

test('a fence follower and its closer stay in the note paragraph', () => {
  const output = html('[^a]: +\n{.x\n.y}\n```\nwa\n```\n\nsee[^a]\n')
  assert.match(output, /<p>\{\.x\n\.y\}\n<code>\nwa\n<\/code><a href=/)
  assert.doesNotMatch(output, /<pre>/)
})
