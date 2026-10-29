/*
 * Reconcile the comparison snapshot with the live corpus. The fixtures the
 * dated runs covered are listed in resources/comparison-run-corpus.txt, so the
 * lag behind them is computed and a corpus addition edits neither the page nor
 * the list.
 * Timings remain properties of the recorded run and are not asserted here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/implementation-comparison-methodology.md'), 'utf8')
const landing = readFileSync(resolve(root, 'docs/index.md'), 'utf8')

const countPairs = (dir) =>
  readdirSync(resolve(root, dir)).filter((f) => f.endsWith('.crv')).length

const quoted = [...page.matchAll(/corpus=(core|optional)(?: selected_corpus=none)? corpus_pairs=(\d+)/g)].map((m) => ({
  corpus: m[1],
  pairs: Number(m[2]),
}))

const runFixtures = readFileSync(resolve(root, 'resources/comparison-run-corpus.txt'), 'utf8').split('\n').filter(Boolean)
const covered = new Set(runFixtures)

const corpusFiles = readdirSync(resolve(root, 'tests/corpus')).filter((f) => f.endsWith('.crv'))
const corpusSidecars = readdirSync(resolve(root, 'tests/corpus')).filter((f) => /\.(md|txt|fmt|ansi)$/.test(f))
const optionalFiles = readdirSync(resolve(root, 'tests/corpus-optional')).filter((f) =>
  f.endsWith('.crv'),
)

const laggedPairs = corpusFiles.filter((f) => !covered.has(`tests/corpus/${f}`)).length
const laggedOptionalPairs = optionalFiles.filter((f) => !covered.has(`tests/corpus-optional/${f}`)).length

// The quoted run's denominator: the live corpus minus what it could not have covered.
const effectiveCore = () => countPairs('tests/corpus') - laggedPairs

const coreRows = () => {
  const core = page.split('## Optional Tier-2 Profile')[0]
  return [...core.matchAll(/^\| (Rust|JS|PHP) \| [^|]+ \| `(\d+) \/ (\d+)` \| `(\d+) \/ (\d+)` \| `(\d+)` \| `(\d+)` \|/gm)]
}

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
    const lagged = corpus === 'core' ? laggedPairs : laggedOptionalPairs
    const lagNote = lagged > 0 ? ` (${lagged} pair(s) added after the run are excluded)` : ''
    assert.equal(
      entry.pairs,
      live,
      `docs/implementation-comparison-methodology.md quotes corpus_pairs=${entry.pairs} for the ${corpus} corpus, which now holds ${live}${lagNote}. Re-run "${rerun}" for the counts this test reads, or "${full}" to retake the whole published snapshot, then "npm run compare:run-corpus".`,
    )
  })
}

// A renamed or removed fixture would silently shrink the run's denominator.
test('every fixture the dated run covered is still in the corpus', () => {
  const live = new Set([
    ...readdirSync(resolve(root, 'tests/corpus')).map((f) => `tests/corpus/${f}`),
    ...readdirSync(resolve(root, 'tests/corpus-optional')).map((f) => `tests/corpus-optional/${f}`),
  ])
  const missing = runFixtures.filter((f) => !live.has(f))
  assert.deepEqual(
    missing,
    [],
    'resources/comparison-run-corpus.txt names fixtures the corpus no longer holds. Renamed or removed ' +
      'since the run? Retake the counts and run "npm run compare:run-corpus".',
  )
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
  const quoted = [
    ...cards.map((m) => [m[1], m[2]]),
    ...coreRows().map((m) => [m[2], m[3]]),
  ]
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
  for (const [passed, total] of quoted) {
    assert.equal(
      Number(total),
      live,
      `docs/implementation-comparison-methodology.md quotes ${passed} / ${total} where the corpus holds ${live}`,
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
  const rows = coreRows().map((m) => m[2])
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

test('the core table scores the fixtures present in the corpus', () => {
  const stems = new Set(corpusFiles.map((f) => f.slice(0, -'.crv'.length)))
  // The lag reaches this column too: a fixture the run predates, document or
  // sidecar, contributes to no engine's score.
  const scored = corpusFiles.length - laggedPairs + corpusSidecars.filter((f) => {
    const match = f.match(/^(.*)\.(md|txt|fmt|ansi)$/)
    return match && stems.has(match[1]) && covered.has(`tests/corpus/${f}`)
  }).length
  const rows = coreRows()
  assert.equal(rows.length, 3)
  for (const row of rows) {
    assert.equal(Number(row[5]) + Number(row[7]), scored, `${row[1]} scored fixtures plus errors differ from the corpus population ${scored}`)
  }
})

test('a quoted run never compares more documents than it ran', () => {
  // `compared=N` in a block's target-agreement section counts documents from
  // THAT run, so it cannot exceed the run's own `corpus_pairs`. The optional
  // block quoted `compared=547` under `corpus_pairs=33` - the core run's rows,
  // pasted into the optional block, claiming coverage sixteen times the size of
  // the corpus that run uses.
  const blocks = [...page.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1])
  const checked = []
  let fullRuns = 0
  for (const block of blocks) {
    const pairs = block.match(/corpus_pairs=(\d+)/)
    if (!pairs) continue
    const limit = Number(pairs[1])
    const targets = block.match(/targets=([^\n]+)/)?.[1].split(',') ?? []
    const rows = [...block.matchAll(/^(\w+): compared=(\d+)/gm)]
    if (/^counts_only=1 /m.test(block)) {
      assert.equal(rows.length, 0, 'a count-only run cannot claim full target agreement')
      assert.match(block, /^counts_only_note=.*no agreement claim/m)
      const measured = block.match(/^counts_only=1 targets_measured=([^ ]+) of ([^\n]+)/m)
      assert.ok(measured, 'a count-only run must name its measured targets')
      assert.deepEqual(measured[1].split(','), targets)
      assert.deepEqual(measured[2].split(','), targets)
      continue
    }
    assert.ok(targets.length > 0)
    assert.deepEqual(rows.map((row) => row[1]), targets, 'a full run needs an agreement row for every target')
    fullRuns++
    for (const [, target, compared] of block.matchAll(/^(\w+): compared=(\d+)/gm)) {
      checked.push(`${target}=${compared}`)
      assert.ok(
        Number(compared) <= limit,
        `a quoted run says ${target}: compared=${compared} where its own corpus_pairs=${limit}`,
      )
    }
  }
  assert.ok(fullRuns > 0 && checked.length > 0, 'expected target rows in at least one full comparison')
  assert.match(page, /\[\d{4}-\d{2}-\d{2} five-target core run\]\(https:\/\/github\.com\/markup-carve\/carve\/blob\/[a-f0-9]{40}\/docs\/implementation-comparison-methodology\.md\)/,
    'the count-only refresh must retain a dated link to the full core comparison')
})

test('a quoted run\'s diff total matches its own per-target rows', () => {
  // `cross_impl_diffs` is the sum over every target in that run, so a block
  // saying `cross_impl_diffs=10` above rows that all read `diffs=0` is quoting
  // two different runs at once - which the optional block did, with a total
  // from the core run and rows from its own.
  const blocks = [...page.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1])
  let checked = 0
  for (const block of blocks) {
    if (/^counts_only=1 /m.test(block)) continue
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
  const fullRuns = blocks.filter((block) => /corpus_pairs=/.test(block) && !/^counts_only=1 /m.test(block))
  assert.ok(fullRuns.length > 0)
  assert.equal(checked, fullRuns.length, 'every full comparison needs a diff total and target rows')
})

test('the landing page states that implementations share inputs without a volatile count', () => {
  assert.match(landing, /tested with the same Carve inputs and expected\n  HTML outputs/)
  assert.doesNotMatch(
    landing,
    /same \d+ Carve inputs/,
    'the landing-page advantage should not require an update whenever the corpus grows',
  )
})

test('the core introduction agrees with its scored-fixture table', () => {
  const prose = page.replace(/\s+/g, ' ')
  const population = /The count-only run covers ([\d,]+) core documents and their ([\d,]+) target sidecars\./.exec(prose)
  const scored = /The run scores ([\d,]+) fixtures per engine\./.exec(prose)
  assert.ok(population, 'core introduction must state its document and sidecar counts')
  assert.ok(scored, 'core introduction must state its scored-fixture count')
  const count = (text) => Number(text.replaceAll(',', ''))
  const documents = count(population[1])
  const sidecars = count(population[2])
  const fixtures = count(scored[1])
  assert.equal(documents + sidecars, fixtures)
  for (const row of coreRows()) {
    assert.equal(Number(row[4]) + Number(row[6]), Number(row[5]), `${row[1]} scored results do not add up`)
    assert.equal(Number(row[3]), documents, `${row[1]} document count differs from the introduction`)
    assert.equal(Number(row[5]) + Number(row[7]), fixtures, `${row[1]} scored denominator differs from the introduction`)
  }
})

test('the optional table accounts for the quoted profile population', () => {
  const section = page.split('## Optional Tier-2 Profile')[1].split('## CLI timing')[0]
  const rows = [...section.matchAll(/^\| (Rust|JS|PHP) \| `(\d+) \/ (\d+)` \| `(\d+)` \| `(\d+)` \| `(\d+)` \|/gm)]
  assert.equal(rows.length, 3)
  const population = quoted.find(({ corpus }) => corpus === 'optional').pairs
  for (const [, engine, passed, measured, skipped, mismatches, errors] of rows) {
    assert.equal(Number(measured) + Number(errors) + Number(skipped), population, `${engine} optional table omits cases`)
    assert.equal(Number(passed) + Number(mismatches), Number(measured), `${engine} optional results do not add up`)
    const summary = new RegExp(`^${engine.toLowerCase()}: pass=(\\d+)/(\\d+) mismatch=(\\d+) error=(\\d+) skipped=(\\d+)`, 'm').exec(page.split('Optional run summary')[1])
    assert.ok(summary, `${engine} optional summary is missing`)
    assert.deepEqual(summary.slice(1), [passed, measured, mismatches, errors, skipped], `${engine} optional table differs from its summary`)
  }
})
