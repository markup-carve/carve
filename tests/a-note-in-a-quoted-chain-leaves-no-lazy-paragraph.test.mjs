import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A footnote body takes a lazy line like every container (carve#3885).
for (const depth of [1, 2, 3]) {
  test(`a note takes a lazy line through ${depth} quote levels`, () => {
    const source = `${'> '.repeat(depth)}[^n]: e\n${'> '.repeat(depth)}  k\nx\n\nr[^n]\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<li id="fn1">\s*<p>e\nk\nx<a href="#fnref1"/)
    assert.equal((html.match(/<blockquote>/g) ?? []).length, depth)
  })
}

for (const marker of ['-', '1.']) {
  // Rule A opens an indented quote at every level (carve#3885), and the note
  // in it takes the unmarked lines.
  test(`an indented quote under prose opens after the ${marker} item text`, () => {
    const source = `> lead\n> ${marker} item\n>   > inner\n>   > [^n]: note\n       tail\nend\n\nr[^n]\n`
    const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
    assert.match(html, new RegExp(`^<blockquote> <p>lead ${marker.replace('.', '\\.')} item</p> <blockquote> ?<p>inner</p> ?</blockquote> </blockquote>`))
    assert.match(html, /<li id="fn1"> <p>note tail end<a href/)
  })
}

// A footnote definition interrupts the quote paragraph (§10 I5) and takes the lazy line.
test('a later quote paragraph ends at a note that takes the lazy line', () => {
  const source = '> :: t\n> : d\n>\n> para\n>   [^n]: e\n>         k\nlazy\n\nr[^n]\n'
  const html = renderDoc(parse(source)).replace(/\s+/g, ' ')
  assert.match(html, /<p>para<\/p> <\/blockquote>/)
  assert.match(html, /<li id="fn1"> <p>e k lazy<a href/)
})
