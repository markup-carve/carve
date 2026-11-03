// PART 23, ALL STRING CONTENT IS LITERAL UNICODE (carve#5049): an authored U+E000,
// U+E001 or U+0002 is text, never one of the model's render frames.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('the reproduction keeps its U+E000 in the code payload', () => {
  assert.equal(html('```\nx\n```\n'), '<pre><code>x\n</code></pre>')
  assert.equal(html('a  b\n'), '<p>a  b</p>')
})

test('every carrier keeps the characters', () => {
  const cases = [
    ['`ab`\n', '<p><code>ab</code></p>'],
    ['a\u0002b\n', '<p>a\u0002b</p>'],
    ['[x](uv)\n', '<p><a href="uv">x</a></p>'],
    ['{.c title="t"}\npara\n', '<p class="c" title="t">para</p>'],
    ['|= a |\n| b\u0002 |\n', '<table>\n  <thead>\n    <tr><th scope="col">a</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>b\u0002</td></tr>\n  </tbody>\n</table>'],
    ['[a][]\n\n[a]: /u\n', '<p><a href="/u">a</a></p>'],
    ['::: |\nv\n:::\n', '<div class="line-block">\n  <p>v</p>\n</div>'],
  ]
  for (const [src, out] of cases) assert.equal(html(src), out, JSON.stringify(src))
})

test('an authored frame spelling is not read as a frame', () => {
  assert.equal(html('aref:{}\n'), '<p>aref:{}</p>')
  assert.equal(html('xquote:1:0\n'), '<p>xquote:1:0</p>')
  assert.match(html('```=html\nxref:a\n```\n\n# A\n'), /^xref:a\n<section id="A">/)
})

test('U+0002 still reads as a C0 control where the clauses drop one', () => {
  assert.equal(html('# \u0002x\n'), html('# \u0005x\n').replaceAll('\u0005', '\u0002'))
  assert.equal(html('*x*{k="java\u0002script:x"}\n'), '<p><strong k="">x</strong></p>')
})

test('the parse result keeps the authored characters after a render', () => {
  const doc = parse('ab\u0002\n\n[l]: /u\n')
  const before = JSON.stringify(doc.blocks)
  renderDoc(doc)
  assert.equal(JSON.stringify(doc.blocks), before)
  assert.ok(doc.linkDefs.has('l') || [...doc.linkDefs.keys()].some((k) => k.includes('')))
})

test('a document already holding the preferred stand-ins picks others', () => {
  assert.equal(html('\u0003 \u0002\n'), '<p>\u0003 \u0002</p>')
})
