/*
 * CARVE-P11-045 on `editorial_comment`, and the golden that states it.
 *
 * The three engines agreed on writing the bare content, so engine agreement
 * could not see the defect and no clause reached the node (carve#2791). The
 * structure sweep in the-markdown-writer-fixtures-read-back.test.mjs cannot
 * see it either: a `span` is not one of the elements a GFM reader builds a
 * document out of, so the flattened bytes compared equal there. What is asked
 * here is the boundary itself, in the clause and in the golden the engines
 * render against - and through cmark-gfm, because a boundary the foreign
 * reader drops is not a boundary.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'
import { cmarkGfmToHtml } from '../scripts/lib/markdown-oracle.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(repo, path), 'utf8')
const spans = (html) => (html.match(/<span class="critic-comment">/g) ?? []).length

const golden = JSON.parse(read('tests/fixtures/markdown-writer-targets.json')).find(
  (c) => c.name === 'editorial-comment-keeps-its-boundary',
)

test('the clause requires the critic-comment span on the Markdown target', () => {
  const grammar = read('resources/grammar.ebnf')
  const start = grammar.indexOf('[CARVE-P11-045]')
  assert.notEqual(start, -1, 'CARVE-P11-045 is absent from the grammar')
  const clause = grammar.slice(start, grammar.indexOf('[CARVE-P11-050]')).replace(/\n\s+/g, ' ')
  assert.match(clause, /`editorial_comment`/)
  assert.match(clause, /<span class="critic-comment">/)
})

test('the golden keeps the comment out of the prose, and GFM reads it back', () => {
  assert.ok(golden, 'the fixture case is gone')
  const own = carveToHtml(golden.carve)
  assert.equal(spans(own), 1, 'the HTML target lost the span the golden is compared against')
  assert.equal(spans(cmarkGfmToHtml(golden.markdown)), spans(own))
})
