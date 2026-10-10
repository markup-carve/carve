import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { renderInline } from '../scripts/spec/render.mjs'

const vectors = JSON.parse(readFileSync(new URL('../resources/spec/nested-braced-emphasis-cases.json', import.meta.url), 'utf8'))
for (const vector of vectors.cases) {
  test(vector.id, () => {
    assert.equal(`<p>${renderInline(vector.source)}</p>`, vector.html)
  })
}

const malformed = JSON.parse(readFileSync(new URL('./fixtures/malformed-braced-emphasis.json', import.meta.url), 'utf8'))
for (const vector of malformed) {
  test(vector.id, () => {
    assert.equal(`<p>${renderInline(vector.source)}</p>`, vector.html)
  })
}

const boundaries = JSON.parse(readFileSync(new URL('./fixtures/attribute-comment-boundaries.json', import.meta.url), 'utf8'))
for (const vector of boundaries) {
  test(vector.id, () => {
    assert.equal(`<p>${renderInline(vector.source)}</p>`, vector.html)
  })
}

for (const [source, html] of [
  ['p *a b*}{#c} d #}', 'p <strong>a b</strong>}<span class="critic-comment">c} d </span>'],
  ['{*a x{#id} *} #} b*}', '<strong>a x<span class="critic-comment">id} *} </span> b</strong>'],
  ['{*a *{#id} b*}', '<strong>a *{<span class="tag"><strong>#id</strong></span>} b</strong>'],
]) {
  test(`comment boundary control: ${source}`, () => assert.equal(renderInline(source), html))
}
