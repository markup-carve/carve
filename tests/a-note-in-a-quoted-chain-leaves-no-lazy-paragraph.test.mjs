import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const depth of [1, 2, 3]) {
  test(`a note closes lazy reach through ${depth} quote levels`, () => {
    const source = `${'> '.repeat(depth)}[^n]: e\n${'> '.repeat(depth)}  k\nx\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<\/blockquote>\s*<p>x<\/p>/)
    assert.equal((html.match(/<blockquote>/g) ?? []).length, depth)
  })
}

for (const marker of ['-', '1.']) {
  test(`an indented quoted spelling under prose keeps the ${marker} item text`, () => {
    const source = `> lead\n> ${marker} item\n>   > inner\n>   > [^n]: note\n       tail\nend\n`
    const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
    assert.match(html, /<blockquote><p>lead .+ &gt; inner &gt; \[\^n\]: note tail end<\/p><\/blockquote>$/)
  })
}

test('a later quote paragraph can fold after its description ended', () => {
  const source = '> :: t\n> : d\n>\n> para\n>   [^n]: e\n>         k\nlazy\n'
  const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
  assert.match(html, /<p>para \[\^n\]: e k lazy<\/p> <\/blockquote>$/)
})
