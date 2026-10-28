import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

for (const [name, link] of [
  ['implicit', '[H][]'],
  ['explicit', '</#H>'],
]) {
  test(`a used footnote heading resolves an ${name} reference`, () => {
    const result = html(`x[^n]\n\n[^n]: # H\n\n${link}`)
    assert.match(result, /<a href="#H">H<\/a>/)
    assert.match(result, /<h1 id="H">H<\/h1>/)
  })
  test(`an unused footnote heading leaves an ${name} reference literal`, () => {
    const result = html(`[^n]: # H\n\n${link}`)
    assert.doesNotMatch(result, /href="#H"/)
    assert.doesNotMatch(result, /id="H"/)
  })
}

test('a used heading in a nested footnote body is indexed', () => {
  const result = html('x[^n]\n\n[^n]: ::: box\n      ## Nested\n      ::: box\n\n[Nested][]')
  assert.match(result, /href="#Nested"/)
})
