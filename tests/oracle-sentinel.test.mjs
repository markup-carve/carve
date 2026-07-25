// Guard: the executable-spec oracle must NEVER let an internal pipeline framing
// marker reach rendered output. The layout pass prefixes lazy-folded lines with
// LAZY (U+0000 'L' U+0000) and the resolution pass frames refs/notes with
// U+E000 / U+E001 / U+0002 (STX). If any survive into HTML the ground truth is
// corrupt (and, for a shipping engine, a sentinel-injection hazard). A def-list
// whose term and definition are at mismatched indents once leaked the LAZY
// marker into a <dt> (carve#295 follow-up) -- this pins the whole class.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')
const SENTINELS = /[\u0000\u0002\uE000\uE001]/

test('no pipeline sentinel survives into oracle output (whole corpus)', () => {
  for (const f of readdirSync(corpusDir).filter((x) => x.endsWith('.crv'))) {
    const src = readFileSync(resolve(corpusDir, f), 'utf8')
    let out
    try {
      out = renderDoc(parse(src))
    } catch {
      continue // refusals are fine; only rendered output is under test
    }
    assert.ok(!SENTINELS.test(out), `sentinel leaked into output for ${f}`)
  }
})

test('a mismatched-indent def-list does not leak the LAZY marker', () => {
  // The exact shape that regressed: term nested at the content column, its
  // definition line outdented below it. The parse of this pathological input is
  // not pinned as a corpus pair (the engines diverge on the fold), but the
  // no-sentinel invariant is absolute.
  const out = renderDoc(parse('- one\n  :: term\n:  def\n'))
  assert.ok(!SENTINELS.test(out), 'LAZY marker leaked into a def-list term')
})
