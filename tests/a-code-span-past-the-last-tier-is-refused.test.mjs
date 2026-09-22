/*
 * The executable reference pairs code span runs one length per tier, because a
 * PEG cannot compare two run lengths. Past the last tier it REFUSES rather than
 * reading the run as an unclosed span it may not be - an approximation
 * `scripts/formal-core-check.mjs` could not see, where a refusal is counted.
 *
 * The corpus cannot hold a refused document, so the bound is pinned here from
 * both sides: the last tier pairs, and one backtick more refuses.
 */

import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, Refuse, MAX_CODE_RUN } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const run = (n) => '`'.repeat(n)

test('the last tier pairs a run of its own length', () => {
  const r = run(MAX_CODE_RUN)
  assert.equal(html(`a ${r}b${r} c\n`), '<p>a <code>b</code> c</p>')
})

test('a run past the last tier is refused, closed or not', () => {
  const r = run(MAX_CODE_RUN + 1)
  assert.throws(() => html(`a ${r}b${r} c\n`), Refuse)
  assert.throws(() => html(`a ${r}b c\n`), Refuse)
})

test('the tiers are every length from one to the bound', () => {
  // A gap or a shorter list leaves a run to `codeU` unrefused; a longer list
  // leaves tiers the refusal never lets a document reach.
  const ohm = readFileSync(new URL('../resources/carve-core.ohm', import.meta.url), 'utf8')
  const rule = /^\s*codeClosed\s*=([\s\S]*?)\n\s*\/\//m.exec(ohm)
  assert.ok(rule, 'codeClosed not found in resources/carve-core.ohm')
  const lengths = [...rule[1].matchAll(/codeRun<"(`+)">/g)].map((m) => m[1].length).sort((a, b) => a - b)
  assert.deepEqual(lengths, Array.from({ length: MAX_CODE_RUN }, (_, i) => i + 1))
})
