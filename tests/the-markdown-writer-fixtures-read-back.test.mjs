/*
 * PART 11 §9a and §11a, and the shared fixture each engine renders against.
 *
 * tests/fixtures/markdown-writer-targets.json holds the Markdown bytes both
 * clauses decide. The engines assert their own output against it; this file
 * checks the fixture itself, through cmark-gfm (the reader the importers answer
 * to), so a golden that a foreign reader misreads cannot land.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'
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

test('every fixture names a clause that exists', () => {
  assert.ok(cases.length >= 3, 'the fixture is empty')
  for (const c of cases) {
    clauseText(c.rule)
    assert.ok(('carve' in c) !== ('ast' in c), `${c.name} needs exactly one of carve or ast`)
  }
})

test('CARVE-P11-049 keeps the heading suffix rule and leaves cross-references alone', () => {
  const text = clauseText('CARVE-P11-049')
  assert.match(text, /whether or not `id` names a heading/)
  assert.match(text, /THE `\{#id\}` HALF OF §11 IS UNCHANGED/)
  assert.match(text, /A CROSS-REFERENCE IS OUTSIDE THIS CLAUSE/)
})

test('CARVE-P11-048 scopes the HTML spelling to a table cell', () => {
  const text = clauseText('CARVE-P11-048')
  assert.match(text, /Inside a pipe-table cell/)
  assert.match(text, /§9 holds everywhere a Markdown line can end/)
})

for (const c of cases.filter((c) => c.rule === 'CARVE-P11-049')) {
  test(`${c.name}: the Markdown keeps every link the HTML target writes`, () => {
    // The reader sees the same destinations the HTML target emits, heading
    // or not. `%28`/`%29` is the ordinary destination encoding of `(`/`)`.
    const expected = hrefs(carveToHtml(c.carve)).map((href) => href.replace(/\(/g, '%28').replace(/\)/g, '%29'))
    assert.deepEqual(hrefs(cmarkGfmToHtml(c.markdown)), expected)
  })
}

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
