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
