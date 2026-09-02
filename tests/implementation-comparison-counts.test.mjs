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
 *
 * A DECLARED LAG, and why it is not a hole in the above.
 *
 * `compare:impls` needs three engine checkouts, and a corpus change can land on
 * a host that has none. Under the rule as first written the only way to keep
 * this file green was then to edit the denominators by hand - to publish a
 * three-engine measurement nobody took. That is worse than a stale page: a
 * stale number is visibly old, a fabricated one is not, and for carve#887 the
 * fabricated number would also have been WRONG, since carve-rs still opens an
 * admonition on a tabbed metadata slot (markup-carve/carve-rs#722).
 *
 * So the page may DECLARE the categories added after its quoted run, in one
 * line naming them, and this file adds their fixtures back before comparing.
 * The declaration cannot carry a count - it names categories, and the count is
 * derived here by listing their files - so there is nothing in it to fabricate.
 * It fails in both directions, which is what makes it a check rather than an
 * escape hatch:
 *
 *   - a category is declared but contributes no fixture (renamed, renumbered,
 *     removed) -> red, so the line cannot rot into a blanket excuse.
 *   - the run IS retaken and the quoted number moves, but the line stays ->
 *     quoted + lag now exceeds the corpus -> red, so whoever re-runs
 *     `compare:impls` has to delete it in the same commit.
 *
 * It is the same shape as `resources/engine-pin-drift.txt`, for the same
 * reason: the corpus is deliberately allowed to run ahead, and what must never
 * happen is not knowing which window you are in (carve#533).
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

// The categories the page declares as added after its quoted run. Names only:
// every number below is counted from the corpus directory, never read from the
// page. Absent line = no lag, which is the normal state.
const declaredAfterRun = (label) => {
  const m = page.match(new RegExp(`^${label} added since this run: (.+?)\\.$`, 'ms'))
  if (!m) return []
  return [...m[1].matchAll(/`([^`]+)`/g)].map((x) => x[1])
}

const laggedCategories = declaredAfterRun('Corpus')

// The OPTIONAL corpus needs the same declaration, and used to be excused from
// it on the grounds that "nothing has ever added to it from a host that could
// not re-run the tool". carve#560 is that host: it adds the two cases that pin
// smartTypography on the plain-text and ANSI targets, on a machine with no
// engine checkouts, so the choice was a declared lag or a hand-edited
// three-engine measurement nobody took. Same rule, same two directions of
// failure.
const laggedOptional = declaredAfterRun('Optional corpus')

const corpusFiles = readdirSync(resolve(root, 'tests/corpus')).filter((f) => f.endsWith('.crv'))
const optionalFiles = readdirSync(resolve(root, 'tests/corpus-optional')).filter((f) =>
  f.endsWith('.crv'),
)

/** The fixtures one declared category contributes: `NN-slug.crv` and `NN-slug-K.crv`. */
const fixturesOf = (category) =>
  corpusFiles.filter(
    (f) =>
      f === `${category}.crv` ||
      // The example index suffix, and ONLY that: `-2.crv`, not `-too-2.crv`.
      // Slicing without the prefix test matched any file long enough to end in
      // `-<digits>.crv`, whatever category it belonged to.
      (f.startsWith(category) && /^-\d+\.crv$/.test(f.slice(category.length))),
  )

const laggedPairs = laggedCategories.reduce((n, c) => n + fixturesOf(c).length, 0)

// An optional case is one `.crv`, with no `-K` sub-pairs, so its slug is the
// whole of the pairing rule.
const optionalFixturesOf = (slug) => optionalFiles.filter((f) => f === `${slug}.crv`)
const laggedOptionalPairs = laggedOptional.reduce((n, c) => n + optionalFixturesOf(c).length, 0)

// The quoted run's denominator plus whatever it could not have covered. With no
// declaration this is exactly the live count, i.e. the original rule.
const effectiveCore = () => countPairs('tests/corpus') - laggedPairs

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
    const live =
      corpus === 'core'
        ? effectiveCore()
        : countPairs('tests/corpus-optional') - laggedOptionalPairs
    // Name the CHEAP command first. This message used to say `npm run
    // compare:impls`, which is the five-target sweep - roughly twenty minutes -
    // and it was the only instruction offered for a failure that turns on two
    // numbers this test reads and no timing at all. `--counts-only` renders
    // every document once per engine and emits both of them, so it is the
    // honest answer to "this count is stale" (carve#804). The full sweep is
    // still what the published snapshot is, so it is named too.
    const suffix = corpus === 'optional' ? ' -- --corpus=optional' : ''
    const rerun = `npm run compare:counts${suffix}`
    const full = `npm run compare:impls${suffix}`
    const declared = corpus === 'core' ? laggedCategories : laggedOptional
    const declaredPairs = corpus === 'core' ? laggedPairs : laggedOptionalPairs
    const lagNote =
      declaredPairs > 0
        ? ` (${declaredPairs} pair(s) in ${declared.length} declared-lag categor(ies) are excluded)`
        : ''
    assert.equal(
      entry.pairs,
      live,
      `docs/implementation-comparison.md quotes corpus_pairs=${entry.pairs} for the ${corpus} corpus, which now holds ${live}${lagNote}. Re-run "${rerun}" for the counts this test reads, or "${full}" to retake the whole published snapshot.`,
    )
  })
}

// The declaration is names, and a name that matches nothing is a blanket excuse
// with no expiry. Two ways it rots - the category is renumbered by a rebase, or
// removed outright - and both leave a line that keeps subtracting zero while
// reading as though it still describes something.
test('every declared-lag category still contributes fixtures', () => {
  const declared = [
    ...laggedCategories.map((c) => [c, fixturesOf(c)]),
    ...laggedOptional.map((c) => [c, optionalFixturesOf(c)]),
  ]
  for (const [category, files] of declared) {
    assert.ok(
      files.length > 0,
      `docs/implementation-comparison.md declares "${category}" as added since its quoted ` +
        `run, but no tests/corpus fixture carries that name. Renumbered by a rebase, or ` +
        `removed? Fix the name or delete the line - a declaration that matches nothing ` +
        `excuses everything.`,
    )
  }
})

test('the comparison cards and table quote the real core corpus size', () => {
  // The same run appears three times on that page: a card grid, a table, and
  // the raw text block. Only the text block was pinned at first, so the grid
  // and table went on saying 302 next to a corrected 529.
  //
  // All three speak for the SAME run, so the declared lag applies identically:
  // a category the run predates is missing from the card grid and the table for
  // exactly the reason it is missing from the text block.
  const live = effectiveCore()
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
  const m = landing.match(/same (\d+) Carve inputs/)
  assert.ok(m, 'docs/index.md no longer states the number of shared Carve inputs')
  assert.equal(
    Number(m[1]),
    live,
    `docs/index.md says the implementations share ${m[1]} inputs; the test set holds ${live}`,
  )
})
