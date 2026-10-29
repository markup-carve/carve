import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

// carve#4000: the marker kind plays no part in CARVE-P9-067.
for (const marker of ['1.', 'a)', 'b.', 'A)', 'i.', 'IV)']) {
  test(`a stacked ${marker} + takes a follower at the host item's column`, () => {
    const out = html(`- o\n  - ${marker} +\n  s\n`)
    assert.match(out, /<li>s<\/li>\n\s*<\/ol>\n\s*<\/li>\n\s*<\/ul>\n\s*<\/li>\n<\/ul>$/)
  })
}
