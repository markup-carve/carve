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

test('a refused run keeps plain text after its block-shaped follower in a note', () => {
  for (const follower of ['# h', '{.z}', ':: d', '| a |']) {
    const output = html(`r[^a]\n\n[^a]: +\n{.x\n.y}\n${follower}\nb\n`)
    assert.match(output, /\.y\}\n[^<]*\nb<a href="#fnref1" role="doc-backlink"/)
    assert.doesNotMatch(output, /<p>b<\/p>/)
  }
})

test('a refused run keeps a marker-column follower in a nested note', () => {
  const output = html('- x\n  [^a]: +\n  {.x\n  .y}\n  - li\n\nsee[^a]\n')
  assert.match(output, /<p>\{\.x\n\.y\}\n- li<a href="#fnref1" role="doc-backlink"/)
  assert.doesNotMatch(output, /<li>li<\/li>/)
})
