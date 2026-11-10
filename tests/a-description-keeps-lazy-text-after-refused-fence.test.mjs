import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const fence of ['```', '~~~']) for (const lead of ['{.x', '{#id']) {
  test(`description paragraph owns short text after a refused ${fence} follower from ${lead}`, () => {
    const src = `:: term\n: ${lead}\n  }\n  ${fence}\nplain\n`
    const out = html(src)
    assert.match(out, /<dd>/)
    assert.doesNotMatch(out, /<\/dl>\n<p>plain<\/p>/)
    assert.match(out, /plain(?:<\/code>)?<\/dd>\n<\/dl>$/)
  })
}
