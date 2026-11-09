import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

for (const [name, indent] of [['shifted', ' '], ['unshifted', '']]) {
  test(`a ${name} brace line inside inline code does not protect the next fence (#5618)`, () => {
    const source = `p\n${indent}\`open\n${indent}{.x\n${indent}.y}\n${indent}\`\`\`\n${indent}z\n`
    assert.equal(html(source), '<p>p\n<code>open\n{.x\n.y}</code></p>\n<pre><code>z\n</code></pre>')
  })
}

test('an escaped backtick does not hide a refused brace run (#5618)', () => {
  assert.equal(html('p\\`open\n{.x\n.y}\n```\nz\n'), '<p>p`open\n{.x\n.y}\n<code>\nz</code></p>')
})

test('a backtick inside an inline comment does not hide a refused brace run (#5618)', () => {
  assert.equal(html('p {% ` %}\n{.x\n.y}\n```\nz\n'), '<p>p \n{.x\n.y}\n<code>\nz</code></p>')
})

test('a valid attribute line stays inside an open inline code span (#5618)', () => {
  assert.equal(html('p\n`open\n{.x}\n`\n'), '<p>p\n<code>open\n{.x}\n</code></p>')
})

test('a backtick in a link destination does not hide a refused brace run (#5618)', () => {
  assert.equal(html('p\n [x](`url)\n {.x\n .y}\n ```\n z\n'), '<p>p\n<a href="`url">x</a>\n{.x\n.y}\n<code>\nz</code></p>')
})

test('a backtick in a link title does not hide a refused brace run (#5618)', () => {
  assert.equal(html('p\n [x](/u "`title")\n {.x\n .y}\n ```\n z\n'), '<p>p\n<a href="/u" title="`title">x</a>\n{.x\n.y}\n<code>\nz</code></p>')
})

test('a quoted parenthesis in a link title does not open inline code (#5618)', () => {
  assert.equal(html('p [x](/u "a)b`c")\n{.x}\ntail\n'), '<p>p <a href="/u" title="a)b`c">x</a></p>\n<p class="x">tail</p>')
})

test('an unattached attribute-shaped run does not hide its backtick (#5618)', () => {
  assert.equal(html('p {title="`"}\n{.x}\ntail\n'), '<p>p {title=“<code>"}\n{.x}\ntail</code></p>')
})

for (const prefix of ['p)', 'p]', 'p>', 'p*']) {
  test(`an unattached attribute after ${prefix} leaves its backtick visible (#5618)`, () => {
    const output = html(`${prefix}{title="\`"}\n{.x}\ntail\n`)
    assert.ok(output.includes('\n{.x}\ntail</code>'), output)
  })
}

test('a multiline emphasis span owns the backtick in its attached attribute (#5618)', () => {
  assert.equal(html('p *hi\nthere*{title="`"}\n{.x}\ntail\n'), '<p>p <strong title="`">hi\nthere</strong></p>\n<p class="x">tail</p>')
})

test('a backtick in a multiline link title does not open code (#5618)', () => {
  assert.equal(html('p [x](/url "a\n`b")\n{.x}\ntail\n'), '<p>p <a href="/url" title="a\n`b">x</a></p>\n<p class="x">tail</p>')
})
