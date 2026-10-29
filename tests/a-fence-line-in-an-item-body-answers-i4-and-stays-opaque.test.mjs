import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

// §10 I4 (carve#3967, carve#4018): a fence line interrupts the open quoted paragraph
// without a closer, and an unmarked line below the quote ends the fence in every host.
const stacks = [['- > ', '  > '], ['- > > ', '  > > '], ['1. > ', '   > '], ['- a\n  - > ', '    > '], ['- - - > ', '      > ']]
for (const [head, pad] of stacks) {
  for (const fence of ['```', '~~~', '````', '``` x']) {
    test(`"${head.replace('\n', ' / ')}para" then an unclosed "${fence}": tail leaves`, () => {
      const out = html(`${head}para\n${pad}${fence}\n${pad}x\ntail\n`)
      assert.match(out, /<p>para<\/p>\s*<pre><code[^>]*>x\n<\/code><\/pre>/)
      assert.match(out, /\n<p>tail<\/p>\s*$/)
    })
    test(`"${head.replace('\n', ' / ')}para" then a closed "${fence}": tail leaves`, () => {
      const run = fence.match(/^[`~]+/)[0]
      assert.match(html(`${head}para\n${pad}${fence}\n${pad}x\n${pad}${run}\ntail\n`), /\n<p>tail<\/p>\s*$/)
    })
  }
}

// PART 0 opacity (carve#3978): what a code or comment fence holds never
// changes how the item reads the lines around it.
const shown = (source) => html(source).replaceAll(/<code([^>]*)>[^<]*<\/code>/g, '<code$1>C</code>')
const payloads = ['- i', '1. k', '* x', '> q', '# h', '- [ ] t', '[^1]: n', '- a\n- b']
for (const [head, col] of [['- head', 2], ['1. head', 3], ['- a\n  - head', 4]]) {
  for (const [open, close] of [['```', '```'], ['~~~', '~~~'], ['%%%', '%%%']]) {
    for (const payload of payloads) for (const shift of [0, 2]) {
      test(`${head.replace('\n', ' / ')}: "${payload.replace('\n', ' / ')}" in "${open}" ${shift} past the column reads like plain text`, () => {
        const pad = ' '.repeat(col + shift)
        const doc = (body) => [head, '', pad + open, ...body.split('\n').map((l) => pad + l), pad + close,
          pad + '%%%', pad + 'zpay', '%%%', '', ' '.repeat(col) + 'tail'].join('\n') + '\n'
        assert.equal(shown(doc(payload)), shown(doc(payload.split('\n').map(() => 'i').join('\n'))))
      })
    }
  }
}

test('carve#3967', () => {
  assert.equal(html('- > para\n  > ```\n  > x\ntail\n'),
    '<ul>\n  <li>\n    <blockquote>\n      <p>para</p>\n      <pre><code>x\n</code></pre>\n    </blockquote>\n  </li>\n</ul>\n<p>tail</p>')
})

test('carve#3978', () => {
  const doc = (payload) => ['- head', '', '    ```', `    ${payload}`, '    ```', '    %%%', '    zpay', '%%%', '', '  tail'].join('\n') + '\n'
  assert.equal(html(doc('- i')).replace('- i', 'i'), html(doc('i')))
  assert.doesNotMatch(html(doc('- i')), /zpay/)
})
