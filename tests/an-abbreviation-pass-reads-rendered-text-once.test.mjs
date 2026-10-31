/*
 * An abbreviation pass reads rendered text once (PART 9R R3, carve#4556), and
 * brackets past the nesting cap stay literal (PART 9 §25, carve#4557).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('no frame of the raw pass reaches the output', () => {
  const out = html('*[A]: x\n\n# `A`{=html} A\n\n```=html\nA\n```\n\n[`A`{=html}][r] ^[`A`{=html}]\n\n[r]: u\n')
  assert.doesNotMatch(out, /[\uE000\uE001]/)
  assert.match(out, /<a href="u">A<\/a>/)
})

test('a raw payload in a cross-reference keeps its text and stays unscanned', () => {
  const out = html('*[A]: x\n\n# `A`{=html} z\n\n</#z>\n')
  assert.match(out, /<h1>A z<\/h1>/)
  assert.match(out, /<a href="#z">A z<\/a>/)
})

test('a term that names an attribute, an entity or a tag changes no markup', () => {
  const out = html('*[title]: 1\n*[amp]: 2\n*[p]: 3\n*[A]: 4\n\n[A & b]{title="title"}\n')
  assert.equal(out, '<p><span title="title"><abbr title="4">A</abbr> &amp; b</span></p>')
})

for (const depth of [201, 300, 2000]) {
  test(`${depth} nested pairs stay literal`, () => {
    const run = `${'['.repeat(depth)}x${']'.repeat(depth)}`
    assert.equal(html(`${run}\n`), `<p>${run}</p>`)
  })
}

test('markup in a pair past the cap stays source', () => {
  const run = `${'['.repeat(201)}\\[*x*${']'.repeat(201)}`
  assert.equal(html(`${run}\n`), `<p>${run}</p>`)
})
