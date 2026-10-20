import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const depth of [1, 2, 3]) {
  test(`a nested note keeps its outer body line at item depth ${depth}`, () => {
    const items = Array.from({ length: depth }, (_, i) => `${'  '.repeat(i)}- a\n`).join('')
    const source = `${items}${'  '.repeat(depth)}[^n]: e\n${'  '.repeat(depth + 1)}[^n]: e\n${'  '.repeat(depth + 1)}q\n`
    const html = renderDoc(parse(source))
    assert.equal((html.match(/<li>/g) ?? []).length, depth)
    assert.doesNotMatch(html, />q</)
    assert.doesNotMatch(html, /aq/)
  })
}

test('the same note ownership applies inside a quote', () => {
  const source = '> - a\n>   [^n]: e\n>     [^n]: e\n>     q\n'
  assert.match(renderDoc(parse(source)), /<blockquote>\s*<ul>\s*<li>a<\/li>\s*<\/ul>\s*<\/blockquote>/)
})
