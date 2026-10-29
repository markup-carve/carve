import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A valid table row (PART 9 §10 I1) and a reference definition (I5) both end
// the paragraph above them; an unclosed fence below runs past the container's
// closer to the end of input (carve#4018).
const render = (first, second, tail = '::::\n:::\nafter *b*') =>
  renderDoc(parse(`::: note\n${first}\n${second}\n\`\`\`\ncode\n${tail}\n`))
const runsPastCloser = /<pre><code>code\n::::\n:::\nafter \*b\*\n<\/code><\/pre>\n<\/aside>$/

for (const [name, first, second] of [
  ['table row', 'para', '| t |'],
  ['table row with a row attribute', 'para', '| t |{.x}'],
  ['quoted table row', '> para', '> | t |'],
  ['nested quoted table row', '> > para', '> > | t |'],
  ['link definition', 'para', '[r]: /u'],
  ['quoted link definition', '> para', '> [r]: /u'],
  ['nested quoted link definition', '> > para', '> > [r]: /u'],
]) test(`${name} closes the paragraph, and the unclosed fence runs past the colon closer`, () => {
  assert.match(render(first, second).trim(), runsPastCloser)
})

test('control: a pipe line with no closing pipe is paragraph text', () => {
  assert.match(render('para', '| t', ':::\nafter *b*'), /<p>para\n\| t<\/p>\n  <pre><code>code\n/)
})

test('control: a quoted pipe line with no closing pipe keeps the quote paragraph open', () => {
  assert.match(render('> para', '> | t', ':::\nafter *b*'), /<blockquote><p>para\n\| t<\/p><\/blockquote>\n  <pre><code>code\n/)
})

// A fenced body is not a paragraph, so it never folds lazily into the quoted note (carve#4018).
test('quoted footnote definition does not take the unclosed fence as note text', () => {
  const html = render('> para', '> [^r]: n').replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
  assert.equal(html, '<aside class="admonition note" aria-label="Note"><blockquote><p>para</p></blockquote><pre><code>code :::: ::: after *b*</code></pre></aside>')
})
