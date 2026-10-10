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
