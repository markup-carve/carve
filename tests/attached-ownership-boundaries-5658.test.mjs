import assert from 'node:assert/strict'
import test from 'node:test'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

for (const [host, source, owner] of [
  ['quote', '> +\n::: note\nx\n+\nzq', 'doc/div:2'],
  ['item', '- +\n::: note\nx\n+\nzq', 'doc/item:1/div:2'],
]) {
  test(`an open ${host}-attached colon owns the later plus and its follower`, () => {
    assert.match(html(source), /<p>x\n\+\nzq<\/p>/)
    const trace = modelTrace(source)
    assert.equal(trace[3].owner, owner)
    assert.equal(trace[3].form, 'text')
    assert.equal(trace[4].owner, owner)
  })
}

test('an own-line attachment ends when a note-contained line misses its item', () => {
  const source = '::: note\n- x\n+\n```\n\nb\n  ```\n:::'
  const rendered = html(source)
  assert.match(rendered, /<\/ul>\n  <p>b<\/p>\n  <pre><code><\/code><\/pre>/)
  assert.equal(modelTrace(source)[5].owner, 'doc/div:1')
})

test('a nested refused marker leaves the next line in its inner item', () => {
  const source = '- - ```\n  +\n\n    x'
  assert.match(html(source), /<pre><code><\/code><\/pre>\n        <p>x<\/p>/)
  assert.equal(modelTrace(source)[3].owner, 'doc/item:1/item:1')
})
