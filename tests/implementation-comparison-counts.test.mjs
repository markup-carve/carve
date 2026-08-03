/*
 * The comparison page quotes a run, and a quoted run goes stale.
 *
 * docs/implementation-comparison.md embeds the raw output of
 * `npm run compare:impls` so a reader can see what the tool reports without
 * running four engines. That output carries `corpus_pairs=N`, and N is a fact
 * about this repository that anyone can check - so nobody did. The page said
 * 302 core pairs when there were 529, and its own hand-written correction note
 * ("has since grown to 31 pairs") was itself out of date at 33.
 *
 * This pins only the counts, not the whole block. The timings and the pass
 * lines are properties of the machine that ran it and are meant to be a
 * snapshot; the corpus size is not, and a page claiming the tool covers 302
 * documents when it covers 529 understates it by 43%.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/implementation-comparison.md'), 'utf8')
const landing = readFileSync(resolve(root, 'docs/index.md'), 'utf8')

const countPairs = (dir) =>
  readdirSync(resolve(root, dir)).filter((f) => f.endsWith('.crv')).length

const quoted = [...page.matchAll(/corpus=(core|optional) corpus_pairs=(\d+)/g)].map((m) => ({
  corpus: m[1],
  pairs: Number(m[2]),
}))

test('the page quotes a run for both corpora', () => {
  assert.deepEqual(
    quoted.map((q) => q.corpus).sort(),
    ['core', 'optional'],
    'expected one quoted summary line per corpus; the page shape changed',
  )
})

for (const corpus of ['core', 'optional']) {
  test(`the quoted ${corpus} corpus size is the real one`, () => {
    const entry = quoted.find((q) => q.corpus === corpus)
    assert.ok(entry, `no quoted summary line for the ${corpus} corpus`)
    const live = countPairs(corpus === 'core' ? 'tests/corpus' : 'tests/corpus-optional')
    const rerun =
      corpus === 'optional'
        ? 'npm run compare:impls -- --corpus=optional'
        : 'npm run compare:impls'
    assert.equal(
      entry.pairs,
      live,
      `docs/implementation-comparison.md quotes corpus_pairs=${entry.pairs} for the ${corpus} corpus, which now holds ${live}. Re-run "${rerun}" and paste the current output.`,
    )
  })
}

test('the comparison cards and table quote the real core corpus size', () => {
  // The same run appears three times on that page: a card grid, a table, and
  // the raw text block. Only the text block was pinned at first, so the grid
  // and table went on saying 302 next to a corrected 529.
  const live = countPairs('tests/corpus')
  //
  // Matched narrowly on purpose: the optional-profile block on the same page
  // legitimately quotes `3 / 3`, and a loose "N / N" pattern flagged it. Only
  // the card grid (<strong>N / N</strong>) and the core table (`N / N` in
  // backticks) speak for the core corpus.
  // The optional-profile section has a table of the same shape, quoting the
  // optional corpus, so the scan stops at its heading.
  const core = page.split('## Optional Tier-2 Profile')[0]
  const cards = [...core.matchAll(/<strong>(\d+)\s*\/\s*(\d+)<\/strong>/g)]
  const tableCells = [...core.matchAll(/\|\s*`(\d+)\s*\/\s*(\d+)`\s*\|/g)]
  const quotedPairs = [...cards, ...tableCells]
    .filter(([, a, b]) => a === b)
    .map(([, a]) => Number(a))
  assert.ok(quotedPairs.length >= 6, `expected the card grid and table to quote N / N; found ${quotedPairs.length}`)
  for (const n of quotedPairs) {
    assert.equal(n, live, `docs/implementation-comparison.md quotes ${n} / ${n} where the corpus holds ${live}`)
  }
})

test('the landing page quotes the real corpus size', () => {
  const live = countPairs('tests/corpus')
  const m = landing.match(/pinned by (\d+) corpus examples/)
  assert.ok(m, 'docs/index.md no longer states a corpus example count in the expected phrasing')
  assert.equal(
    Number(m[1]),
    live,
    `docs/index.md says "pinned by ${m[1]} corpus examples"; the corpus holds ${live}`,
  )
})
