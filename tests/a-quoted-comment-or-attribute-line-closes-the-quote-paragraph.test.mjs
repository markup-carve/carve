import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#3258: a quoted or item comment line closes the paragraph above it.
// carve#4018: the fence opens either way, and the colon closer does not end it.
const render = (first, second, tail = '::::\n:::\nafter *b*') =>
  renderDoc(parse(`::: note\n${first}\n${second}\n\`\`\`\ncode\n${tail}\n`))
const runsPastCloser = /<pre(?: id="x")?><code>code\n::::\n:::\nafter \*b\*\n<\/code><\/pre>\n<\/aside>$/

for (const [name, first, second] of [
  ['quoted comment', '> para', '> %% c'],
  ['quoted attribute line', '> para', '> {#x}'],
  ['nested quoted comment', '> > para', '> > %% c'],
  ['comment in a quote opened under a quoted paragraph', '> para', '> > %% c'],
  ['comment item after an item paragraph', '- para', '- %% c'],
  ['attribute item after an item paragraph', '- para', '- {#x}'],
  ['ordered comment item', '1. para', '2. %% c'],
  ['comment sub-item', '- para', '  - %% c'],
]) test(`${name} closes the paragraph, and the unclosed fence runs past the colon closer`, () => {
  assert.match(render(first, second).trim(), runsPastCloser)
})

const interrupts = /(?:<\/blockquote>|<\/ul>)\n  <pre><code>code\n:::\nafter \*b\*\n<\/code><\/pre>\n<\/aside>$/
for (const [name, first, second] of [
  ['quoted text', '> para', '> more text'],
  ['item text', '- para', '- more text'],
]) test(`control: ${name} keeps the paragraph open, and the fence still interrupts it`, () => {
  assert.match(render(first, second, ':::\nafter *b*').trim(), interrupts)
})

test('control: a dash line under a plain paragraph is paragraph text, not an item', () => {
  assert.match(render('para', '- %% c', ':::\nafter *b*'), /<p>para\n-<\/p>\n  <pre><code>code\n/)
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
