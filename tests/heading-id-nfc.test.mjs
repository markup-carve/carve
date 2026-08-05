/*
 * A heading id is NFC-normalized before slugging.
 *
 * The grammar said this in TWO places and contradicted itself. §25 (Trojan
 * Source) required the normalization and spelled out the consequence - "a
 * precomposed `é` (U+00E9) and a decomposed `e` + U+0301 yield the SAME id (NFC)"
 * - while the HEADING IDENTIFIERS bullet denied it: "NO Unicode normalization
 * (NFC) is applied, so the slug needs no Unicode tables and is byte-identical
 * across implementations".
 *
 * Reality agreed with §25: the oracle, carve-js, carve-rs and carve-php all
 * compose, and `tests/corpus/119-trojan-source-heading-ids-are-nfc-normalized-...`
 * pins the composed id in its fixture - its FILENAME states the rule the other
 * bullet denied. So the bullet was the outlier and it is the bullet that changed
 * (carve#705).
 *
 * The old rationale was inverted too: every implementation normalizes, so the
 * Unicode tables are carried either way. Dropping the normalization to "need no
 * tables" would have meant changing three engines, the oracle and a corpus
 * fixture, and would have reopened the §25 hole it was added to close.
 *
 * This test pins the BEHAVIOR the surviving clause states, so an attempt to
 * implement the deleted sentence fails here rather than silently diverging. Note
 * the input is built from explicit code points: a `Café` literal in a source file
 * is normally already composed, so writing it directly would assert nothing.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const idOf = (src) => /id="([^"]*)"/.exec(html(src))?.[1]

const COMBINING_ACUTE = '́'
const PRECOMPOSED = 'é'

test('a decomposed heading composes in its id', () => {
  const id = idOf(`# Cafe${COMBINING_ACUTE}\n`)
  assert.equal(id, `Caf${PRECOMPOSED}`)
  // Explicitly: the combining mark is gone from the id.
  assert.ok(!id.includes(COMBINING_ACUTE), JSON.stringify(id))
})

test('a precomposed heading keeps the same id', () => {
  assert.equal(idOf(`# Caf${PRECOMPOSED}\n`), `Caf${PRECOMPOSED}`)
})

test('the two spellings yield the SAME id', () => {
  // §25's stated consequence, which is the whole point of normalizing: two
  // spellings of one heading cannot produce two different anchors.
  assert.equal(idOf(`# Cafe${COMBINING_ACUTE}\n`), idOf(`# Caf${PRECOMPOSED}\n`))
})

test('a duplicate suffix is applied AFTER normalization', () => {
  // Both headings normalize to one id, so the second must be suffixed - which
  // only happens if the dedup sees the composed form.
  const out = html(`# Cafe${COMBINING_ACUTE}\n\n# Caf${PRECOMPOSED}\n`)
  assert.match(out, new RegExp(`id="Caf${PRECOMPOSED}"`), out)
  assert.match(out, new RegExp(`id="Caf${PRECOMPOSED}-2"`), out)
})

test('case and non-ASCII still pass through unchanged', () => {
  // The rest of the bullet, untouched: normalization is not folding.
  assert.equal(idOf('# 日本語\n'), '日本語')
  assert.equal(idOf('# MiXeD Case\n'), 'MiXeD-Case')
})

test('a crossref in the SAME spelling resolves', () => {
  // Deliberately not the cross-spelling case. Whether a reference spelled with
  // different normalization than its heading resolves is a 3-to-1 divergence -
  // carve-rs normalizes the heading-reference key, the oracle, carve-js and
  // carve-php do not - and it is filed separately rather than decided here. My
  // first version of this test asserted carve-rs's answer without checking, which
  // would have pinned a minority behavior into the spec repo on the back of a
  // docs fix.
  const nfd = html(`# Cafe${COMBINING_ACUTE}\n\nsee [Cafe${COMBINING_ACUTE}][]\n`)
  assert.match(nfd, new RegExp(`href="#Caf${PRECOMPOSED}"`), nfd)

  const pre = html(`# Caf${PRECOMPOSED}\n\nsee [Caf${PRECOMPOSED}][]\n`)
  assert.match(pre, new RegExp(`href="#Caf${PRECOMPOSED}"`), pre)
})
