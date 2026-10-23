import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#3258: the colon-closer scan held a paragraph open across any quote or
// item line, so an unclosed fence below ran to the end of the document.
const render = (first, second, tail = '::::\n:::\nafter *b*') =>
  renderDoc(parse(`::: note\n${first}\n${second}\n\`\`\`\ncode\n${tail}\n`))
const endsAtCloser = /<pre(?: id="x")?><code>code\n::::\n<\/code><\/pre>\n<\/aside>\n<p>after <strong>b<\/strong><\/p>$/

for (const [name, first, second] of [
  ['quoted comment', '> para', '> %% c'],
  ['quoted attribute line', '> para', '> {#x}'],
  ['nested quoted comment', '> > para', '> > %% c'],
  ['comment in a quote opened under a quoted paragraph', '> para', '> > %% c'],
  ['comment item after an item paragraph', '- para', '- %% c'],
  ['attribute item after an item paragraph', '- para', '- {#x}'],
  ['ordered comment item', '1. para', '2. %% c'],
  ['comment sub-item', '- para', '  - %% c'],
]) test(`${name} closes the paragraph, so the fence ends at the closer`, () => {
  assert.match(render(first, second).trim(), endsAtCloser)
})

const opaque = /<code>\ncode<\/code>(?:<\/p>)?(?:<\/blockquote>|<\/li>)[\s\S]*<\/aside>\n<p>after <strong>b<\/strong><\/p>$/
for (const [name, first, second] of [
  ['quoted text', '> para', '> more text'],
  ['item text', '- para', '- more text'],
]) test(`control: ${name} keeps the paragraph open, so the fence opens nothing`, () => {
  assert.match(render(first, second, ':::\nafter *b*').trim(), opaque)
})

test('control: a dash line under a plain paragraph is paragraph text, not an item', () => {
  assert.match(render('para', '- %% c', ':::\nafter *b*'), /<p>para\n-\n<code>\ncode<\/code><\/p>/)
})

for (const head of ['{x', '{.c} x', 'p']) {
  test(`a quoted ${head} paragraph keeps the lazy list marker`, () => {
    const html = renderDoc(parse(`> ${head}\n- z\n  :: t\n  : zq\n`))
    assert.match(html, /<blockquote><p>[^<]*\n- z\n:: t\n: zq<\/p><\/blockquote>/)
    assert.doesNotMatch(html, /<li>/)
  })
}
