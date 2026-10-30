/*
 * A caption after a quote attaches to it and ends it (CARVE-P2-008), so a
 * quote after the caption reads as it would on its own, and no lazy frame
 * reaches the output (carve#4312).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

const heads = ['> - t', '> 1. t', '> - - t', '> - t\n>   u', '> - t\nlazy', '- > - t', '> a\nlazy']
const tails = ['>   # h\nl', '>   [^f]: n\nl\n\nr[^f]', '>   ||\nl', '>   x\nl', '> - b\nl', '>   [r]: /u\nl']

for (const head of heads) {
  for (const tail of tails) {
    const src = `${head}\n^ p\n${tail}\n`
    test(JSON.stringify(src), () => {
      const out = html(src)
      assert.ok(!out.includes('\u0000'), out)
      const own = html(`${tail}\n`)
      assert.ok(out.replace(/\s+/g, '').includes(own.replace(/<section[^]*$/, '').replace(/\s+/g, '')), `${out}\n---\n${own}`)
    })
  }
}

test('a caption past a note still folds into the note', () => {
  assert.match(html('> [^n]: x\n^ p\nl\n\nr[^n]\n'), /<p>x\n\^ p\nl<a href="#fnref1"/)
})
