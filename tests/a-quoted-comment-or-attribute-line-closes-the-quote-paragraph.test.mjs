import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#3258: the colon-closer scan held a paragraph open across any quote or
// item line. Under carve#4018 the fence opens whatever paragraph is open, and
// unclosed it runs to the end of the input, the colon closers included.
const render = (first, second, tail = '::::\n:::\nafter *b*') =>
  renderDoc(parse(`::: note\n${first}\n${second}\n\`\`\`\ncode\n${tail}\n`))
const runsToEnd = (tail) => new RegExp(`<pre><code>code\\n${tail.replace(/\*/g, '\\*')}\\n</code></pre>\\n</aside>$`)

for (const [name, first, second] of [
  ['quoted comment', '> para', '> %% c'],
  ['quoted attribute line', '> para', '> {#x}'],
  ['nested quoted comment', '> > para', '> > %% c'],
  ['comment in a quote opened under a quoted paragraph', '> para', '> > %% c'],
  ['comment item after an item paragraph', '- para', '- %% c'],
  ['attribute item after an item paragraph', '- para', '- {#x}'],
  ['ordered comment item', '1. para', '2. %% c'],
  ['comment sub-item', '- para', '  - %% c'],
]) test(`${name}: the unclosed fence runs past the colon closers`, () => {
  assert.match(render(first, second).trim(), runsToEnd('::::\n:::\nafter *b*'))
})

for (const [name, first, second] of [
  ['quoted text', '> para', '> more text'],
  ['item text', '- para', '- more text'],
]) test(`control: under ${name} the fence opens too`, () => {
  assert.match(render(first, second, ':::\nafter *b*').trim(), runsToEnd(':::\nafter *b*'))
})

test('control: a dash line under a plain paragraph is paragraph text, not an item', () => {
  const html = render('para', '- %% c', ':::\nafter *b*')
  assert.match(html, /<p>para\n-<\/p>/)
  assert.match(html.trim(), runsToEnd(':::\nafter *b*'))
})

for (const head of ['{x', '{.c} x', 'p']) {
  test(`a quoted ${head} paragraph keeps the lazy list marker`, () => {
    const html = renderDoc(parse(`> ${head}\n- z\n  :: t\n  : zq\n`))
    assert.match(html, /<blockquote><p>[^<]*\n- z<\/p><\/blockquote>\n<dl>\n  <dt>t<\/dt>\n  <dd>zq<\/dd>\n<\/dl>$/)
    assert.doesNotMatch(html, /<li>/)
  })
}

test('a wrapped quoted attribute closes the preceding paragraph', () => {
  const html = renderDoc(parse('> para\n> {.c\n>  #x}\n'))
  assert.doesNotMatch(html, /<p>para\n\{\.c/)
})
