import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderInline } from '../scripts/spec/render.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const CASES = [
  ['"Wait---" he said.', '“Wait—” he said.'],
  ["say '𐐀", 'say ’𐐀'],
  ["'one '𐐀 two'", '‘one ’𐐀 two’'],
  ['[—]{.c}"Go"', '<span class="c">—</span>”Go”'],
  ["a['q'](u)", 'a<a href="u">‘q’</a>'],
  ['[]{}"q"', '<span></span>”q”'],
  ['` `{=html}"q"', ' ”q”'],
  ['`<!--`{=html}"q"', '<!--”q”'],
  ["[`<i title=\"a\">`{=html} 'q'][u]", '<a href="u"><i title="a"> ‘q’</a>'],
  ['he said—"Go"', 'he said—“Go”'],
  ["'tis 'em 'twasn't", '’tis ’em ’twasn’t'],
  ["'n' and 'em'", '‘n’ and ‘em’'],
  ["'em'2", '’em’2'],
  ["'tis Jane's dog", '’tis Jane’s dog'],
  ["'I told 'em so,' he said.", '‘I told ’em so,’ he said.'],
  ["'I said 'hello there,' she replied.", '‘I said ’hello there,’ she replied.'],
  ["say 'word", 'say ’word'],
  ["'word", '‘word'],
  ['"\'word', '“‘word'],
  ["say '*bold* text", 'say ‘<strong>bold</strong> text'],
  ["'Jane's '90s dog and 'word'", '‘Jane’s ’90s dog and ’word’'],
  ["'I *said 'hello* there,' she replied.", '‘I <strong>said ’hello</strong> there,’ she replied.'],
  ['"Wait---{%%}" he said.', '“Wait—” he said.'],
  ['“\'word\'” and ‘"word"’', '“‘word’” and ‘“word”’'],
  ["say '*word", 'say ‘*word'],
  ["say '*bold* 'word", 'say ‘<strong>bold</strong> ’word'],
  ["say 'tissue'", 'say ‘tissue’'],
  ["say 'tisé'", 'say ‘tisé’'],
  ["'one [say 'two](u) three'", '‘one <a href="u">say ’two</a> three’'],
  ["'one [say 'two][u] three'", '‘one <a href="u">say ’two</a> three’'],
]

for (const [source, expected] of CASES) {
  test(`smart quote direction: ${JSON.stringify(source)}`, () => {
    const document = source.includes('[u]') ? `${source}\n\n[u]: u\n` : source
    assert.equal(renderDoc(parse(document)), `<p>${expected}</p>`)
  })
}

for (const word of ['tis', 'tisn', 'twas', 'twasn', 'twere', 'twill', 'twould', 'em', 'cause', 'til', 'n', 'bout']) {
  test(`elision list and quoted-word exception: ${word}`, () => {
    assert.equal(renderInline(`'${word}`), `’${word}`)
    assert.equal(renderInline(`'${word.toUpperCase()}`), `’${word.toUpperCase()}`)
    assert.equal(renderInline(`'${word}'`), `‘${word}’`)
  })
}

for (const dash of ['-', '–', '—']) {
  for (const next of ['', ' ', '\t', '\n', '\r', '\u00a0', '"', "'", '.', ',', ';', ':', '!', '?', ')', ']']) {
    test(`closing after ${dash} before ${JSON.stringify(next)}`, () => {
      assert.equal(renderInline(`x${dash}"${next}`).at(2), '”')
      assert.equal(renderInline(`x${dash}'${next}`).at(2), '’')
    })
  }
}

test('footnotes have independent state and finalize their openers', () => {
  const html = renderDoc(parse("'one ^[say 'note] 'two'"))
  assert.match(html, /‘one <a[^]*? ’two’<\/p>/)
  assert.match(html, /<p>say ’note<a/)
  const separate = renderDoc(parse("say ^['note] 'two'"))
  assert.match(separate, / ‘two’<\/p>/)
  assert.match(separate, /<p>‘note<a/)
})

test('quote state resets between blocks', () => {
  assert.equal(renderDoc(parse("'one\n\nsay 'two'")), '<p>‘one</p>\n<p>say ‘two’</p>')
})

test('escaped, code, raw, URL and attribute quotes keep their spelling', () => {
  assert.equal(renderInline('\\"\\\' `"\'` `"\'`{=html} [x](a\'b "q") [x]{title="\'tis"}'),
    '"\' <code>"\'</code> "\' <a href="a&apos;b" title="q">x</a> <span title="&apos;tis">x</span>')
})
