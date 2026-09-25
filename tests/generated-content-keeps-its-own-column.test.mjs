/*
 * PART 10 §4's CARVE-P10-010, read and then measured (carve#2289).
 *
 * EVERY OTHER TEST FOR THESE THREE DIRECTIVES SPELLS THE MARKER SO THAT THE
 * PLACED ELEMENT LANDS AT COLUMN 0, the one ambient indentation where all three
 * engines agree, so the suite could not see this class at all. The documents
 * below open a heading section first, which gives the placed element an ambient
 * indentation of 2 - the position that told carve-js, carve-rs and carve-php
 * apart.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, tocPlacement, glossary, index } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

function clause() {
  const start = grammar.indexOf("A PLACED ELEMENT'S OWN TAGS CARRY THE PER-IMPLEMENTATION INDENTATION")
  assert.notEqual(start, -1, 'CARVE-P10-010 is gone from the grammar')
  const rest = grammar.slice(start)
  const end = rest.indexOf('\n   5. PARAGRAPH WRAPPING')
  assert.notEqual(end, -1, 'CARVE-P10-010 no longer sits at the end of PART 10 §4')
  return rest.slice(0, end)
}

/** Leading-space count of the first line matching `pattern`, or -1. */
const column = (html, pattern) => {
  const line = html.split('\n').find((candidate) => pattern.test(candidate))
  return line === undefined ? -1 : line.length - line.trimStart().length
}

const columns = (html, pattern) =>
  html.split('\n').filter((line) => pattern.test(line)).map((line) => line.length - line.trimStart().length)

test('the clause draws the boundary at the placed element\'s own two tags', () => {
  const body = clause()
  assert.match(body, /\[CARVE-P10-010\]/)
  assert.match(body, /THE OPENING AND CLOSING TAG may carry the nesting indentation above or may sit at\s+column 0/)
  assert.match(body, /neither is pinned/)
  assert.match(body, /ONE COLUMN\s+SERVES BOTH TAGS/)
  assert.match(body, /THE GENERATED CONTENT between them is the cross-implementation contract,\s+BYTE-IDENTICAL/)
  assert.match(body, /never read off the marker/)
})

test('the clause governs the three directives with one wording', () => {
  const body = clause()
  assert.match(body, /`toc`, `glossary` and `index` are governed by this one wording/)
  assert.match(body, /may not redraw this boundary/)
  for (const element of ['<nav class="toc">', '<dl class="glossary">', '<ul class="index">']) {
    assert.ok(body.includes(element), `the clause no longer names ${element} as a placed element`)
  }
})

test('the clause example writes the generated list flush left under an indented heading', () => {
  const body = clause()
  const lines = body.split('\n')
  const example = lines.slice(lines.findIndex((line) => line.includes('<section id="Heading">'))).join('\n')
  const base = column(example, /<section id="Heading">/)
  assert.equal(column(example, /<h1>/) - base, 2, 'the example stopped nesting the heading section')
  assert.deepEqual(
    [column(example, /^\s*<ul>/), column(example, /<li>/), column(example, /<\/ul>/)],
    [base, base, base],
    'the example indents the generated list, which is the shape this clause refuses',
  )
  assert.deepEqual(
    [column(example, /<nav /), column(example, /<\/nav>/)],
    [base, base],
    'the example no longer writes one column for both of the placed element\'s tags',
  )
})

test('the TOC list stays at column 0 where the marker sits inside a heading section', () => {
  const html = carveToHtml('# Heading\n\n::: toc\n:::\n', { extensions: [tocPlacement()] })
  const lines = html.split('\n')
  const at = (pattern) => lines.findIndex((line) => pattern.test(line))
  assert.ok(
    at(/<section /) < at(/<nav /) && at(/<nav /) < at(/<\/section>/),
    'the nav no longer lands inside a wrapped heading section, so its ambient indentation is 0 '
      + 'again - the one position where all three engines agree and this class cannot appear',
  )
  assert.deepEqual(
    columns(html, /^\s*<\/?(ul|li)/),
    [0, 0, 0],
    'the generated list must be byte-identical at column 0 wherever the marker was written',
  )
  assert.equal(column(html, /<nav /), column(html, /<\/nav>/), 'one column serves both of the placed element\'s tags')
})

test('a glossary and an index keep their rows one level inside their own placed element', () => {
  const dl = carveToHtml('# H\n\n::: glossary\n:: term\n: def\n:::\n', { extensions: [glossary()] })
  const dlBase = column(dl, /<dl /)
  assert.ok(dlBase > 0, 'the `<dl>` is back at column 0, the position this class cannot appear in')
  assert.equal(column(dl, /<\/dl>/), dlBase, 'the `<dl>` opener and closer sit at different columns')
  assert.deepEqual(columns(dl, /<d[td][ >]/).map((c) => c - dlBase), [2, 2], 'the glossary rows left their own element')

  const ul = carveToHtml('# H\n\nA :index[widget] x.\n\n::: index\n:::\n', { extensions: [index()] })
  const ulBase = column(ul, /<ul class="index">/)
  assert.ok(ulBase > 0, 'the index `<ul>` is back at column 0, the position this class cannot appear in')
  assert.equal(column(ul, /<\/ul>/), ulBase, 'the index `<ul>` opener and closer sit at different columns')
  assert.deepEqual(columns(ul, /<li>/).map((c) => c - ulBase), [2], 'the index items left their own element')
})
