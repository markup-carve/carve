import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src + '\n')).trim()
const noteBody = (src) => /<li id="fn1">\s*<p>(.*?)<a href="#fnref1"/s.exec(html(src))?.[1]

// Inside a note `^[` opens nothing, so the bracketed run after the `^` takes
// its tail like any other (carve#3938).
for (const [tail, link] of [['(u)', '<a href="u">'], ['(u){.c}', '<a href="u" class="c">'], ['[r]', '<a href="/v">']]) {
  for (const inner of ['a', 'a^', 'a[g]', '^[g]^']) {
    const src = `^[x ^[${inner}]${tail} b]\n\n[r]: /v`
    test(`nested note opener: ${src}`, () => {
      assert.equal(noteBody(src), `x ^${link}${inner}</a> b`)
    })
  }
}

test('a link inside a note in link text keeps its destination', () => {
  assert.equal(noteBody('[t ^[x [a](u) b]](/w)'), 'x <a href="u">a</a> b')
  assert.equal(noteBody('[t ^[x ^[a](u) b]](/w)'), 'x ^<a href="u">a</a> b')
})

// A split combined token's `*` is an ordinary delimiter, so a block glued to it
// attaches to the span it closes (carve#3939).
for (const [src, out] of [
  ['b *//*{c_}*/', '<p>b <strong c_="">//</strong>*/</p>'],
  ['//*a*{c_}*/', '<p>//<strong c_="">a</strong>*/</p>'],
  ['b *///*{t="*/"}*/', '<p>b <strong t="*/">///</strong>*/</p>'],
  ['b *///*{t=a*/} z*/', '<p>b <strong t="a*/">///</strong> z*/</p>'],
]) {
  test(`split combined token: ${src}`, () => assert.equal(html(src), out))
}

// A forced span's own delimiter is literal, so a block after it is text and
// cannot hide the span's closer (carve#3939).
for (const d of ['/', '*', '_', '~', '=']) {
  const tag = { '/': 'em', '*': 'strong', '_': 'u', '~': 's', '=': 'mark' }[d]
  test(`forced span keeps its closer: {${d}x ${d}b${d}{t=a${d}}`, () => {
    assert.equal(html(`{${d}x ${d}b${d}{t=a${d}}`), `<p><${tag}>x ${d}b${d}{t=a</${tag}></p>`)
  })
}
