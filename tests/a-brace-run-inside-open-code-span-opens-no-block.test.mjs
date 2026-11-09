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
