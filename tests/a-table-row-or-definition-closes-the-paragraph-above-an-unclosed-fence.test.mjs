import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A valid table row (PART 9 §10 I1) and a reference definition (I5) both end
// the paragraph above them, so an unclosed fence below opens and the
// container's own closer ends it.
const render = (first, second, tail = '::::\n:::\nafter *b*') =>
  renderDoc(parse(`::: note\n${first}\n${second}\n\`\`\`\ncode\n${tail}\n`))
const endsAtCloser = /<pre><code>code\n::::\n<\/code><\/pre>\n<\/aside>\n<p>after <strong>b<\/strong><\/p>$/

for (const [name, first, second] of [
  ['table row', 'para', '| t |'],
  ['table row with a row attribute', 'para', '| t |{.x}'],
  ['quoted table row', '> para', '> | t |'],
  ['nested quoted table row', '> > para', '> > | t |'],
  ['link definition', 'para', '[r]: /u'],
  ['quoted link definition', '> para', '> [r]: /u'],
  ['quoted footnote definition', '> para', '> [^r]: n'],
  ['nested quoted link definition', '> > para', '> > [r]: /u'],
]) test(`${name} closes the paragraph, so the fence ends at the closer`, () => {
  assert.match(render(first, second).trim(), endsAtCloser)
})

test('control: a pipe line with no closing pipe is paragraph text', () => {
  assert.match(render('para', '| t', ':::\nafter *b*'), /<p>para\n\| t\n<code>\ncode<\/code><\/p>/)
})

test('control: a quoted pipe line with no closing pipe keeps the quote paragraph open', () => {
  assert.match(render('> para', '> | t', ':::\nafter *b*'), /<blockquote><p>para\n\| t\n<code>\ncode<\/code><\/p><\/blockquote>/)
})
