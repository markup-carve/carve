/*
 * A lazy line below a quote whose stacked item `+` took a paragraph folds into
 * that paragraph, as it does when the line carries the prefix (PART 9 §10 I6,
 * carve#3972 case lazy-478d76f7299c).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

for (const quote of ['> ', '> > ']) {
  for (const stack of ['- - +', '- - - +', '1. - +', '- 1. +', '- [ ] - +']) {
    test(`${JSON.stringify(quote + stack)} folds an unprefixed lazy line`, () => {
      assert.equal(html(`${quote}${stack}\n${quote}para\ntail\n`), html(`${quote}${stack}\n${quote}para\n${quote}tail\n`))
    })
  }
}

test('the conformance-pack case', () => {
  const out = html('_u_\n> 1. - +\n> para\n- - > q\ntail\n')
  assert.match(out, /<li>para\n- - &gt; q\ntail<\/li>/, out)
})
