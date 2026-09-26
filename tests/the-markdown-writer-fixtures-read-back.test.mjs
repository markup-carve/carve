/*
 * PART 11's Markdown-target clauses, and the shared fixture each engine renders
 * against.
 *
 * tests/fixtures/markdown-writer-targets.json holds the Markdown bytes the
 * clauses decide. The engines assert their own output against it; this file
 * checks the fixture itself, through cmark-gfm (the reader the importers answer
 * to), so a golden that a foreign reader misreads cannot land: the structure a
 * GFM reader builds from each golden has to match the structure the HTML target
 * builds from the same tree.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, fromAstJson, renderHtml } from '@markup-carve/carve'
import { cmarkGfmToHtml } from '../scripts/lib/markdown-oracle.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(repo, path), 'utf8')
const grammar = read('resources/grammar.ebnf')
const cases = JSON.parse(read('tests/fixtures/markdown-writer-targets.json'))

const clauseText = (id) => {
  const start = grammar.indexOf(`[${id}]`)
  assert.notEqual(start, -1, `${id} is absent from the grammar`)
  const rest = grammar.slice(start + id.length + 2)
  const end = rest.search(/--\s+NORMATIVE\s+\[CARVE-/)
  return rest.slice(0, end === -1 ? rest.length : end).replace(/\n\s+/g, ' ')
}

const hrefs = (html) => [...html.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1])
const rows = (html) => (html.match(/<tr>/g) ?? []).length
const ownHtml = (c) => (c.carve !== undefined ? carveToHtml(c.carve) : renderHtml(fromAstJson(c.ast)))

// Elements a GFM reader can build. A `dl` is not one (PART 11 §10p), and a
// `section` wrapper is the HTML target's own.
const STRUCTURE = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'ul', 'ol', 'blockquote', 'pre', 'a', 'img', 'hr']
const structure = (html) =>
  Object.fromEntries(STRUCTURE.map((tag) => [tag, (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length]))

test('every fixture names a clause that exists', () => {
  assert.ok(cases.length >= 16, 'the fixture lost cases')
  for (const c of cases) {
    clauseText(c.rule)
    assert.ok(('carve' in c) !== ('ast' in c), `${c.name} needs exactly one of carve or ast`)
  }
})

for (const c of cases) {
  test(`${c.name}: a GFM reader builds the structure the HTML target builds`, () => {
    assert.deepEqual(structure(cmarkGfmToHtml(c.markdown)), structure(ownHtml(c)))
  })
}

test('CARVE-P11-038 writes no heading suffix and links by the GFM slug', () => {
  const text = clauseText('CARVE-P11-038')
  assert.match(text, /writes no `\{#id\}` suffix/)
  assert.match(text, /G5 DEDUPLICATED/)
  const slug = cases.find((c) => c.name === 'heading-gfm-slug')
  assert.doesNotMatch(slug.markdown, /\{#/)
  assert.deepEqual(hrefs(cmarkGfmToHtml(slug.markdown)), [
    '#rise-and-divergence',
    '#rise-and-divergence-1',
    '#top-quoted--%C3%BCn%C3%AFcode_x',
  ])
})

test('CARVE-P11-049 keeps fragment links to ids that name no heading', () => {
  const kept = cases.find((c) => c.name === 'fragment-link-is-kept')
  assert.deepEqual(hrefs(cmarkGfmToHtml(kept.markdown)), ['#chap03', '#head', '#n1', '#nowhere'])
  assert.match(clauseText('CARVE-P11-049'), /A CROSS-REFERENCE IS OUTSIDE THIS CLAUSE/)
})

test('escape fixtures read back as text, not markup', () => {
  const html = (name) => cmarkGfmToHtml(cases.find((c) => c.name === name).markdown)
  assert.match(html('cross-node-lt-opens-no-tag'), /&lt;h1&gt;Heading/)
  assert.match(html('ampersand-character-reference'), /&amp;amp; c &amp;#65;/)
  assert.match(html('bang-before-link'), /!<a href="\/u">x<\/a>/)
  assert.match(html('paragraph-line-block-shapes'), /<p>---<\/p>/)
  assert.match(html('pipe-in-table-cell'), /<code>a\|b<\/code>/)
})

const cell = cases.find((c) => c.name === 'table-cell-hard-break')

test('table-cell-hard-break: the reader keeps both rows and every break', () => {
  const html = cmarkGfmToHtml(cell.markdown)
  assert.equal(rows(html), 2)
  assert.equal((html.match(/<br \/?>|<br>/g) ?? []).length, 3)
  assert.doesNotMatch(html, /<p>/, 'part of a cell fell out of the table')
})

test('control: the backslash spelling splits the row under the same reader', () => {
  // Without this the test above could pass on a reader that ignores the
  // difference between the two spellings.
  const html = cmarkGfmToHtml(cell.markdown.replaceAll('<br>', '\\\n'))
  assert.ok(rows(html) !== 2 || /<p>/.test(html), 'the reader did not tell the spellings apart')
})

test('control: the structure comparison sees a merged list and a lost table', () => {
  // The structural test above is only worth something if it fails on the
  // defects these clauses fix.
  assert.notDeepEqual(structure(cmarkGfmToHtml('- a\n\n- b\n')), structure(cmarkGfmToHtml('- a\n\n* b\n')))
  assert.notDeepEqual(structure(cmarkGfmToHtml('| a | b |\n')), structure(cmarkGfmToHtml('|  |  |\n| --- | --- |\n| a | b |\n')))
})
