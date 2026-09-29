/*
 * carve#2578. The never-nest flattening ran in the `bracketed` rule, which
 * spells a span's label as well as a link's text, so a link inside a label lost
 * its destination and `[[t](/v)]{.c}` rendered `<span class="c">t</span>`. All
 * three engines nest it. The flattening now belongs to the two tails that
 * produce a link, `linkTail` and `refTail`.
 *
 * The corpus pins the shapes every engine agrees on; what is here is the pair
 * the corpus cannot carry. The reference-frame and crossref halves of the
 * flattening are oracle-internal - the frame is this pipeline's own sentinel -
 * and the reference-inside-a-link-label case diverges from carve-js for a
 * reason #2578 has nothing to do with, so it is asserted against the oracle
 * alone and named as such.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a span label keeps every link spelling it holds', () => {
  assert.equal(html('[[t](/v)]{.c}\n'), '<p><span class="c"><a href="/v">t</a></span></p>')
  assert.equal(html('[[t][r]]{.c}\n\n[r]: /v\n'), '<p><span class="c"><a href="/v">t</a></span></p>')
  assert.equal(
    html('[<https://e.com>]{.c}\n'),
    '<p><span class="c"><a href="https://e.com">https://e.com</a></span></p>',
  )
  assert.equal(html('[/[t](/v)/]{.c}\n'), '<p><span class="c"><em><a href="/v">t</a></em></span></p>')
  assert.equal(html('[[t](/v)]{}\n'), '<p><span><a href="/v">t</a></span></p>')
})

test('a link label still unwraps, at any depth and in either spelling', () => {
  assert.equal(html('[[t](/v)](/u)\n'), '<p><a href="/u">t</a></p>')
  assert.equal(html('[[[t](/v)]{.d}](/u)\n'), '<p><a href="/u"><span class="d">t</span></a></p>')
  assert.equal(html('[<https://e.com>](/u)\n'), '<p><a href="/u">https://e.com</a></p>')
  // The reference frame is flattened by reading its own text (carve#1195), and
  // a crossref flattens to its resolved text. Both reach the tail as sentinels
  // rather than as an `<a>`, so neither is visible to the anchor unwrap.
  assert.equal(html('[[t](/v)][r]\n\n[r]: /u\n'), '<p><a href="/u">t</a></p>')
})

test('an image is not a link and survives in either host', () => {
  assert.equal(html('[![a](/i)]{.c}\n'), '<p><span class="c"><img src="/i" alt="a"></span></p>')
  assert.equal(html('[![a](/i)](/u)\n'), '<p><a href="/u"><img src="/i" alt="a"></a></p>')
  assert.equal(html('[![a][i]]{.c}\n\n[i]: /i\n'), '<p><span class="c"><img src="/i" alt="a"></span></p>')
})

test('a bare bracket run keeps the link it holds', () => {
  // No tail, so no link and no span: the run is literal text and its content is
  // still inline content (PART 9 §14).
  assert.equal(html('[[t](/v)]\n'), '<p>[<a href="/v">t</a>]</p>')
})
