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
  const quoted = [...cards, ...tableCells]
  assert.ok(quoted.length >= 6, `expected the card grid and table to quote N / N; found ${quoted.length}`)
  // The DENOMINATOR is the claim about this repository - how many documents the
  // run covered. The numerator is how many an engine passed, and it is NOT
  // always the same number: when an engine is behind a rule the corpus already
  // pins, the honest page says `534 / 535`.
  //
  // This used to require numerator === denominator before comparing, which
  // silently dropped any row showing a real mismatch and then failed the
  // "expected at least 6" count. So the page could not report a divergence
  // without breaking its own gate, and the gate passed while the page claimed
  // an all-green cross-engine state that was no longer true.
  for (const [, passed, total] of quoted) {
    assert.equal(
      Number(total),
      live,
      `docs/implementation-comparison.md quotes ${passed} / ${total} where the corpus holds ${live}`,
    )
  }
})

test('the cards and the table agree about what each engine passed', () => {
  // Both speak for the SAME run, and the denominator check above passes when
  // they disagree about the NUMERATOR: the page shipped cards reading
  // `547 / 547` for all three engines directly above a table reading
  // `545 / 547` and `544 / 547`, because the snapshot was taken while two of
  // them were mid-fix and only one half was updated afterwards.
  const core = page.split('## Optional Tier-2 Profile')[0]
  const cards = [...core.matchAll(/<strong>(\d+)\s*\/\s*(\d+)<\/strong>/g)].map((m) => m[1])
  const rows = [...core.matchAll(/\|\s*`(\d+)\s*\/\s*(\d+)`\s*\|/g)].map((m) => m[1])
  assert.equal(
    cards.length,
    rows.length,
    `the card grid quotes ${cards.length} engine results and the table ${rows.length}; one of them changed shape`,
  )
  assert.deepEqual(
    cards,
    rows,
    'the comparison cards and the table quote different pass counts for the same run',
  )
})

test('a quoted run never compares more documents than it ran', () => {
  // `compared=N` in a block's target-agreement section counts documents from
  // THAT run, so it cannot exceed the run's own `corpus_pairs`. The optional
  // block quoted `compared=547` under `corpus_pairs=33` - the core run's rows,
  // pasted into the optional block, claiming coverage sixteen times the size of
  // the corpus that run uses.
  const blocks = [...page.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1])
  const checked = []
  for (const block of blocks) {
    const pairs = block.match(/corpus_pairs=(\d+)/)
    if (!pairs) continue
    const limit = Number(pairs[1])
    for (const [, target, compared] of block.matchAll(/^(\w+): compared=(\d+)/gm)) {
      checked.push(`${target}=${compared}`)
      assert.ok(
        Number(compared) <= limit,
        `a quoted run says ${target}: compared=${compared} where its own corpus_pairs=${limit}`,
      )
    }
  }
  assert.ok(checked.length >= 5, `expected target-agreement rows in the quoted output; found ${checked.length}`)
})

test('a quoted run\'s diff total matches its own per-target rows', () => {
  // `cross_impl_diffs` is the sum over every target in that run, so a block
  // saying `cross_impl_diffs=10` above rows that all read `diffs=0` is quoting
  // two different runs at once - which the optional block did, with a total
  // from the core run and rows from its own.
  const blocks = [...page.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1])
  let checked = 0
  for (const block of blocks) {
    const total = block.match(/cross_impl_diffs=(\d+)/)
    const rows = [...block.matchAll(/^\w+: compared=\d+ diffs=(\d+)/gm)]
    if (!total || rows.length === 0) continue
    const summed = rows.reduce((n, m) => n + Number(m[1]), 0)
    assert.equal(
      summed,
      Number(total[1]),
      `a quoted run says cross_impl_diffs=${total[1]} over per-target rows summing to ${summed}`,
    )
    checked++
  }
  assert.ok(checked >= 2, `expected both quoted runs to carry a diff total; checked ${checked}`)
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
