import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const wrappers = [
  ['', text => `<p><code>${text}</code></p>`],
  ['!', text => `<p>${text}</p>`],
  ['$', text => `<p><span class="math inline" role="math">\\(${text}\\)</span></p>`],
]
for (const [prefix, html] of wrappers) {
  for (const [content, expected] of [
    [' a\nb ', 'a\nb'],
    [' a\nb  ', 'a\nb '],
    [' a\nb', ' a\nb'],
    ['a\nb ', 'a\nb '],
    [' a b ', 'a b'],
  ]) {
    test(`closed ${prefix || 'code'} padding: ${JSON.stringify(content)}`, () => {
      assert.equal(renderDoc(parse(`${prefix}\`${content}\`\n`)), html(expected))
    })
  }
  test(`unclosed ${prefix || 'code'} preserves leading space`, () => {
    assert.equal(renderDoc(parse(`${prefix}\` a\nb\n`)), html(' a\nb'))
  })
}

for (const [prefix, html] of wrappers) {
  test(`unclosed ${prefix || 'code'} strips trailing space only`, () => {
    assert.equal(renderDoc(parse(`${prefix}\` a\nb \n`)), html(' a\nb'))
  })
  test(`whitespace-only ${prefix || 'code'} keeps its newline`, () => {
    assert.equal(renderDoc(parse(`${prefix}\` \n \`\n`)), html('\n'))
  })
}
for (const [source, expected] of [
  ['> ` a\n> b `\n', '<blockquote><p><code>a\nb</code></p></blockquote>'],
  ['- ` a\n  b `\n', '<ul><li><code>a\nb</code></li></ul>'],
  ['` a\r\nb `\r\n', '<p><code>a\nb</code></p>'],
]) {
  test(`multiline padding in ${JSON.stringify(source)}`, () => {
    assert.equal(renderDoc(parse(source)).replace(/>\s+</g, '><'), expected)
  })
}

for (const [format, expected] of [['html', '<p>a\nb</p>'], ['other', '<p></p>']]) {
  test(`raw inline multiline padding: ${format}`, () => {
    assert.equal(renderDoc(parse('` a\nb `{=' + format + '}\n')), expected)
  })
}
