#!/usr/bin/env node
/*
 * ARE ALL THE DECLARATION LISTS CLEAR?
 *
 * One command, two populations, one exit code.
 *
 * This repository's ledgers - resources/engine-pin-drift.txt and its
 * siblings - are only HALF of what a release has to be clear on. The other
 * half lives inside each engine, in the constants its own test files carry
 * against the `tests/spec` (or `spec`) submodule: AHEAD_OF_PIN, KNOWN_GAPS,
 * DECLARED_UNIMPLEMENTED, BEHIND_THE_RULING, KNOWN_LOSSES, AST_DIVERGENCES.
 * Every one of them silences a comparison, and NOTHING compared the two
 * populations against each other. A corpus bump cleans the ledger here and
 * leaves the vendored constant behind, and the only thing that would ever
 * notice is a human reading four repositories at once.
 *
 * So this reads all of them and prints one table.
 *
 * THE THREE OUTCOMES AFTER A PIN BUMP, which is what the check is for:
 *
 *   1. the row is GONE           - the bump shipped the fix. Correct.
 *   2. the row is THERE and still reproduces
 *                                - the bump did not carry what we thought.
 *   3. the row is THERE and no longer reproduces
 *                                - a STALE declaration. The dangerous one:
 *                                  invisible until something re-measures.
 *
 * This script settles 1 against 2-or-3 by COUNTING - it reports what is still
 * declared. Telling 2 from 3 is the job of the two-directional guard each list
 * is supposed to carry, which is why every entry below records whether it HAS
 * one. A list whose `guard` is not `two-way` cannot produce outcome 3 at all,
 * and is reported as UNWIRED whether or not it is empty: a check that cannot
 * fail is worth as much as a stale row (markup-carve/carve#755).
 *
 * A NON-EMPTY LIST IS NOT AUTOMATICALLY A FAILURE. resources/ast-position-
 * waivers.txt is 132 rows and every one of them is `permitted` - a node the
 * producer REASSEMBLED, which PART 12 §4 exempts forever. Each entry below
 * therefore carries a POLICY: `owed` must be empty, `permitted` may not be,
 * `split` decides per row from the row's own last field, and `manual` prints
 * its rows for a human because no mechanical rule separates them.
 *
 *   node scripts/declaration-audit.mjs                # engines from origin/main
 *   node scripts/declaration-audit.mjs --ref worktree # engines as checked out
 *   node scripts/declaration-audit.mjs --no-fetch     # skip the git fetch
 *   node scripts/declaration-audit.mjs --mode=per-pr  # the per-PR verdict
 *
 * The spec repo half is always read from THIS working tree, because that is
 * the tree about to be tagged. The engine half defaults to each engine's
 * `origin/main`, because a local engine checkout is usually parked on a
 * feature branch and describes nothing anyone is about to release.
 *
 * TWO VERDICTS, ONE AUDIT (markup-carve/carve#1811).
 *
 * `--mode=release` (the default) answers "is this tree clear to tag?": every
 * `owed` list must be EMPTY and the carve-js pin must be current.
 *
 * `--mode=per-pr` answers "is this pull request defective?", which is a
 * different question, and the two ENGINE-LAG ledgers are where the two part
 * company. resources/engine-pin-drift.txt exists to DESCRIBE the window
 * between a spec rule landing and an engine shipping it - its own header says
 * that window "is normal and the report exists to describe it", and that it is
 * "DECLARED rather than tolerated". A release cannot ship with that window
 * open; a PULL REQUEST is how the window opens in the first place. Gating both
 * on the same emptiness made every leading spec ruling red by construction,
 * which is what carve#1811 ruled on.
 *
 * resources/engine-fmt-drift.txt describes THE SAME WINDOW from the writer
 * side - the engine reads the new rule and writes the old spelling - and its
 * own header points at the pin ledger for its retention rule. A declared
 * window is declared regardless of which ledger describes it, so it is judged
 * the same way. It held zero rows when carve#1811 landed, which is the only
 * reason the omission was invisible: the difference bites the first time a
 * ruling opens a writer-half window and not before.
 *
 * So in `per-pr` mode:
 *
 *   - both engine-lag ledgers are judged as `declared`: a well-formed row
 *     PASSES, and a row that is not a declaration at all (no reason, or a key
 *     listed twice, so one of the two reasons is silently discarded) FAILS.
 *   - pin staleness REPORTS instead of failing.
 *   - an engine checkout that is simply not there is SKIPPED rather than
 *     counted, because "no sibling clone" is a fact about the machine and not
 *     a finding about the PR.
 *
 * Everything else is identical in both modes. In particular the AST divergence
 * ledgers and the UNDECLARED sweep are NOT relaxed - they caught real holes
 * (carve#1793, carve#1794) and they stay owed per-PR.
 *
 * WHAT KEEPS THE LENIENCY FROM BEING A HOLE. The other half of each ledger's
 * contract - drift that is NOT declared, the carve#533 state of a pinned build
 * silently behind - is gated per-PR by a LIVE check that fails in EITHER
 * direction, an undeclared slug or a declared slug the pin has caught up on.
 * For the pin ledger that is `npm run engine:report -- --check`; for the fmt
 * ledger it is tests/corpus-fmt-roundtrip.test.mjs, which reports undeclared
 * writer drift and carries its own staleness ratchet over the writer-only
 * file, and which runs per-PR under `npm test`. `per-pr` mode defers to those
 * checks by name rather than dropping the question, and
 * tests/the-per-pr-audit-defers-to-a-live-check.test.mjs fails if either step
 * ever leaves the per-PR workflow.
 *
 * Exit 0 in release mode only when every `owed` list is empty, every entry was
 * reachable and parseable, and no declaration-shaped constant exists that this
 * manifest does not name.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { duplicateKeys } from './lib/drift-ledger.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const ref = (() => {
  const i = argv.indexOf('--ref')
  return i === -1 ? 'origin/main' : argv[i + 1]
})()
const doFetch = !argv.includes('--no-fetch') && ref !== 'worktree'

/**
 * `release` (the default) is the pre-tag verdict; `per-pr` is the per-PR one.
 * See the two-verdicts note at the top of this file. The default is the STRICT
 * one on purpose: an unflagged run is the release cut, so forgetting the flag
 * can only ever be too careful.
 */
const MODES = new Set(['release', 'per-pr'])
const mode = (() => {
  const flag = argv.find((a) => a.startsWith('--mode='))
  const raw = flag ? flag.slice('--mode='.length) : (process.env.CARVE_DECL_AUDIT_MODE ?? 'release')
  if (!MODES.has(raw)) {
    console.error(`unknown --mode=${raw}; expected one of ${[...MODES].join(', ')}`)
    process.exit(2)
  }
  return raw
})()
const strict = mode === 'release'

/* ------------------------------------------------------------------ repos */

/**
 * Where each engine is. A sibling checkout, the same convention
 * `npm run ast:check` uses, overridable per repo by environment variable so a
 * release run can point at a clean clone instead of a working checkout.
 */
function siblingRoots() {
  const roots = [resolve(repoRoot, '..')]
  // A LINKED WORKTREE lives anywhere - /tmp during a release run - and its
  // parent holds no engine checkouts. `--git-common-dir` names the real
  // repository, whose parent does. Without this the audit reports every engine
  // UNREACHABLE from a worktree, which reads as "nothing to check".
  try {
    const common = execFileSync('git', ['-C', repoRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim()
    if (common) roots.push(resolve(common, '../..'))
  } catch { /* not a git checkout; the plain sibling guess stands */ }
  return roots
}

function engineDir(name, override) {
  if (override) return override
  for (const root of siblingRoots()) {
    const candidate = join(root, name)
    if (existsSync(candidate)) return candidate
  }
  return join(siblingRoots()[0], name)
}

const REPOS = {
  spec: { dir: repoRoot, alwaysWorktree: true },
  'carve-js': { dir: engineDir('carve-js', process.env.CARVE_JS_DIR) },
  'carve-php': { dir: engineDir('carve-php', process.env.CARVE_PHP_DIR) },
  'carve-rs': { dir: engineDir('carve-rs', process.env.CARVE_RS_DIR) },
}

/* --------------------------------------------------------------- manifest */

/**
 * Every declaration list, in both populations.
 *
 * `guard` is the load-bearing column and it is a claim about the FILE, not
 * about this script: `two-way` means the file itself asserts that a declared
 * row still reproduces, so a stale row goes red there. Anything else means it
 * cannot, and this script says so on every run.
 *
 * `staleness` is what stops that claim from being the very thing this script
 * exists to find. A `guard` field alone is an ASSERTION NOBODY CHECKS - the
 * carve#755 shape, sitting inside the gate written to catch it. Measured:
 * after markup-carve/carve-js#1449 and markup-carve/carve-php#1689 wired three
 * lists in both directions, this file still reported all three as unwired,
 * because flipping the word was a separate manual step nothing tied to the
 * code.
 *
 * So where `staleness` is present it names a LITERAL STRING that must appear
 * in the file - the assertion providing the reverse direction. Deleting or
 * renaming that assertion now fails here, which is the regression mode that
 * actually happens. It does NOT prove the assertion FIRES; only a mutation run
 * does that, and each of these carries one in its own PR.
 *
 * Where `staleness` is ABSENT the guard is reported as CLAIMED rather than
 * verified, and the run says how many of each there are. That is deliberate:
 * back-filling every entry at once would mean inventing anchors for two dozen
 * files in one commit, and a wrong anchor is a false failure on the pre-tag
 * gate. The honest intermediate state is to say which claims are checked.
 */
const MANIFEST = [
  // -- the spec repo's own ledgers ------------------------------------------
  { repo: 'spec', path: 'resources/ast-span-divergence.txt', kind: 'txt', policy: 'owed', guard: 'two-way', owner: 'npm run ast:check' },
  { repo: 'spec', path: 'resources/ast-value-divergence.txt', kind: 'txt', policy: 'owed', guard: 'two-way', owner: 'npm run ast:check' },
  { repo: 'spec', path: 'resources/ast-extent-findings.txt', kind: 'txt', policy: 'owed', guard: 'two-way', owner: 'npm run ast:check' },
  // ONE OF THE TWO ENGINE-LAG ENTRIES: see the `prPolicy` note on the
  // engine-pin ledger below. Same window, described from the writer side.
  { repo: 'spec', path: 'resources/engine-fmt-drift.txt', kind: 'txt', policy: 'owed', prPolicy: 'declared', guard: 'two-way', owner: 'npm run fmt:check' },
  { repo: 'spec', path: 'resources/converter-drift.txt', kind: 'txt', policy: 'owed', guard: 'two-way', owner: 'npm run compare:convert' },
  // THE OTHER ENGINE-LAG ENTRY, AND THE ONE THE RULE WAS WRITTEN FOR. Both
  // are owed before a tag and declared inside a pull request: see the
  // two-verdicts note at the top of this file (carve#1811). `prPolicy` is
  // deliberately a per-entry opt-in rather than a blanket relaxation of
  // `owed`, so relaxing a third ledger stays a visible edit here.
  { repo: 'spec', path: 'resources/engine-pin-drift.txt', kind: 'txt', policy: 'owed', prPolicy: 'declared', guard: 'two-way', owner: 'npm run engine:report -- --check' },
  { repo: 'spec', path: 'resources/oracle-divergence.txt', kind: 'txt', policy: 'owed', guard: 'two-way', owner: 'tests/the-oracle-reads-the-authored-documents.test.mjs' },
  // 132 rows, every one `permitted`: PART 12 §4 exempts a REASSEMBLED node
  // forever. The last field decides, so a row that stops being permitted is
  // counted as owed without anyone editing this manifest.
  { repo: 'spec', path: 'resources/ast-position-waivers.txt', kind: 'txt', policy: 'split', guard: 'two-way', owner: 'tests/ast-waivers.test.mjs' },
  // A counts ratchet rather than a ledger, but it carries a per-document
  // allowlist inside it. Two-directional by construction - the whole object is
  // compared with deepEqual - so a row here cannot rot silently.
  { repo: 'spec', path: 'resources/import-roundtrip-baseline.json', name: 'htmlImportPopulation.expectedRejections', kind: 'json', policy: 'manual', guard: 'two-way', owner: 'tests/import-roundtrip-ratchets.check-helper.mjs' },

  // -- the spec repo's declaration CONSTANTS, which the ledgers do not cover -
  { repo: 'spec', path: 'tests/html-import-contract.check.mjs', name: 'PIN_LAG', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'npm run html-import:check' },
  // Codes the fixture and corpus oracles cannot reach (carve#1835). PRINTED
  // rather than judged, because no rule separates the two kinds it holds: one
  // entry is unreachable by construction - a cap marker, and a spec MAY at that
  // - and two name coverage that carve#1878 may or may not close.
  { repo: 'spec', path: 'tests/html-import-contract.check.mjs', name: 'NOT_COVERED_HERE', kind: 'js', policy: 'manual', guard: 'two-way', owner: 'npm run html-import:check' },
  { repo: 'spec', path: 'tests/ast-positions.test.mjs', name: 'DECLARED_OVER_REACH', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/ast-positions.test.mjs' },
  { repo: 'spec', path: 'tests/the-two-import-exits-agree.test.mjs', name: 'UNMET', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/the-two-import-exits-agree.test.mjs' },
  { repo: 'spec', path: 'tests/optional-corpus.test.mjs', name: 'AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/optional-corpus.test.mjs' },
  { repo: 'spec', path: 'tests/examples-tier3.test.mjs', name: 'AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/a-tier3-example-ahead-of-the-pin-is-declared.test.mjs' },
  { repo: 'spec', path: 'tests/every-labels-key-reaches-the-output.test.mjs', name: 'AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/every-labels-key-reaches-the-output.test.mjs' },
  { repo: 'spec', path: 'tests/ast-schema.test.mjs', name: 'SCHEMA_ROLLOUT_PENDING', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/ast-schema.test.mjs' },
  { repo: 'spec', path: 'tests/corpus-convert.test.mjs', name: 'PINNED_DRIFT', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'per-PR twin of resources/converter-drift.txt' },
  // Capability statements about the PINNED build and about each engine's CLI,
  // not pin lag: no rule separates one that will clear from one that never
  // will, so they are printed for a reader instead of judged.
  { repo: 'spec', path: 'tests/corpus-convert.test.mjs', name: 'PINNED_UNIMPLEMENTED', kind: 'js', policy: 'manual', guard: 'two-way', owner: 'the pinned build exports no djotToCarve' },
  { repo: 'spec', path: 'tests/optional-feature-adapters.test.mjs', name: 'DECLARED_UNREACHABLE', kind: 'js', policy: 'manual', guard: 'two-way', owner: 'per-engine CLI reachability' },
  { repo: 'spec', path: 'tests/ast-spans.test.mjs', name: 'LAST_MEASURED', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/ast-spans.test.mjs' },
  { repo: 'spec', path: 'tests/ast-values.test.mjs', name: 'LAST_MEASURED', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'tests/ast-values.test.mjs' },
  // Engine-rollout and opt-in exemptions in the schema-field sweep. Neither is
  // separable by a rule - `definition_list.loose` is owed and clears with the
  // engine bumps, the two `shortCaption` fields are structural and never will -
  // so the rows are PRINTED rather than judged.
  { repo: 'spec', path: 'tests/schema-fields-are-produced.test.mjs', name: 'ENGINE_ROLLOUT_PENDING', kind: 'js', policy: 'manual', guard: 'two-way', owner: 'tests/schema-fields-are-produced.test.mjs' },
  { repo: 'spec', path: 'tests/schema-fields-are-produced.test.mjs', name: 'OPT_IN_ONLY', kind: 'js', policy: 'permitted', guard: 'two-way', owner: 'Tier-2 opt-in: citations are off by default' },
  { repo: 'spec', path: 'tests/optional-corpus.test.mjs', name: 'DECLARED_UNIMPLEMENTED', kind: 'js', policy: 'manual', guard: 'two-way', owner: 'tests/optional-corpus.test.mjs' },
  // Single-string lags against the pinned build. Deleting the constant IS the
  // fix, so an absent one counts zero rather than failing - the undeclared
  // sweep below is what catches a RENAME.
  { repo: 'spec', path: 'tests/a-wrapper-its-content-spells-away-is-a-ceiling.test.mjs', name: 'PIN_LAG', kind: 'js-string', policy: 'owed', guard: 'two-way', optional: true, owner: 'markup-carve/carve-js#1422' },
  { repo: 'spec', path: 'tests/an-ingested-default-start-is-not-re-emitted.test.mjs', name: 'PIN_LAG', kind: 'js-string', policy: 'owed', guard: 'two-way', optional: true, owner: 'markup-carve/carve-js#1391, markup-carve/carve-rs#1293' },
  { repo: 'spec', path: 'tests/an-unspellable-block-does-not-cancel-list-adjacency.test.mjs', name: 'PIN_LAG', kind: 'js-string', policy: 'owed', guard: 'two-way', optional: true, owner: 'markup-carve/carve#1621' },

  // -- carve-js --------------------------------------------------------------
  { repo: 'carve-js', path: 'test/corpus.test.ts', name: 'AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'test/corpus.test.ts' },
  { repo: 'carve-js', path: 'test/canonical-ahead-of-pin.ts', name: 'CANONICAL_AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'test/corpus-canonical-form.test.ts and test/corpus-render-fixtures.test.ts' },
  { repo: 'carve-js', path: 'test/ast-vocabulary.test.ts', name: 'PENDING_SPEC_DECISION', kind: 'js', policy: 'owed', guard: 'two-way', staleness: 'is pending only on types that still exist and still need a decision', owner: 'test/ast-vocabulary.test.ts' },
  { repo: 'carve-js', path: 'test/optional-corpus.test.ts', name: 'AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'test/optional-corpus.test.ts' },
  { repo: 'carve-js', path: 'test/optional-corpus.test.ts', name: 'DECLARED_UNIMPLEMENTED', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'test/optional-corpus.test.ts' },
  { repo: 'carve-js', path: 'test/html-import-conformance.test.ts', name: 'AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'mirrors spec PIN_LAG' },
  { repo: 'carve-js', path: 'test/the-report-answers-to-the-published-schema.test.ts', name: 'AHEAD_OF_PIN', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'test/the-report-answers-to-the-published-schema.test.ts' },
  { repo: 'carve-js', path: 'test/an-import-s-two-exits-say-the-same-thing.test.ts', name: 'UNMET', kind: 'js', policy: 'owed', guard: 'two-way', owner: 'mirrors spec UNMET' },
  { repo: 'carve-js', path: 'test/no-whitespace-only-line.test.ts', name: 'KNOWN_REMAINING', kind: 'js', policy: 'owed', guard: 'two-way', staleness: "it('is behind only what it is still behind on'", owner: 'markup-carve/carve-js#1449' },
  // ONE-WAY, and it hid four stale rows. Nothing asserts a listed document
  // still loses, so a document that STOPS losing sits here reading as coverage.
  { repo: 'carve-js', path: 'test/ast-round-trip-preserves-source.test.ts', name: 'KNOWN_LOSSES', kind: 'js', policy: 'owed', guard: 'two-way', staleness: "it('still loses what it says it loses'", owner: 'markup-carve/carve-js#1449' },

  // -- carve-php -------------------------------------------------------------
  { repo: 'carve-php', path: 'tests/CarveCorpusTest.php', name: 'KNOWN_GAPS', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'tests/CarveCorpusTest.php' },
  { repo: 'carve-php', path: 'tests/CarveCorpusTest.php', name: 'AHEAD_OF_PIN', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'tests/CarveCorpusTest.php' },
  { repo: 'carve-php', path: 'tests/OptionalCorpusTest.php', name: 'KNOWN_GAPS', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'tests/OptionalCorpusTest.php' },
  { repo: 'carve-php', path: 'tests/OptionalCorpusTest.php', name: 'DECLARED_UNIMPLEMENTED', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'tests/OptionalCorpusTest.php' },
  { repo: 'carve-php', path: 'tests/OptionalCorpusTest.php', name: 'AHEAD_OF_PIN', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'tests/OptionalCorpusTest.php' },
  { repo: 'carve-php', path: 'tests/TestCase/Converter/HtmlImportReportTest.php', name: 'AHEAD_OF_PIN', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'mirrors spec PIN_LAG' },
  { repo: 'carve-php', path: 'tests/TestCase/Converter/HtmlImportReportTest.php', name: 'AST_DIVERGENCES', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'the two import exits disagree in this engine' },
  { repo: 'carve-php', path: 'tests/TestCase/ProfileVocabularyTest.php', name: 'KNOWN_LOSSY_UNDER_A_FULL_PROFILE', kind: 'php', policy: 'owed', guard: 'two-way', owner: 'tests/TestCase/ProfileVocabularyTest.php' },
  { repo: 'carve-php', path: 'tests/TestCase/Filter/ProfileVocabularyConformanceTest.php', name: 'KNOWN_GAPS', kind: 'php', policy: 'manual', guard: 'two-way', owner: 'markup-carve/carve#362' },
  // ONE-WAY, like its carve-js twin, and its single row names a corpus
  // document that upstream renumbered - so it excuses nothing and no check
  // reports it.
  { repo: 'carve-php', path: 'tests/TestCase/Renderer/NoWhitespaceOnlyLineTest.php', name: 'KNOWN_REMAINING', kind: 'php', policy: 'owed', guard: 'two-way', staleness: 'public function testKnownRemainingIsStillBehindOnWhatItClaims', owner: 'markup-carve/carve-php#1689' },

  // -- carve-rs --------------------------------------------------------------
  { repo: 'carve-rs', path: 'tests/corpus.rs', name: 'KNOWN_GAPS', kind: 'rust', policy: 'owed', guard: 'two-way', owner: 'tests/corpus.rs' },
  { repo: 'carve-rs', path: 'tests/corpus.rs', name: 'AHEAD_OF_PIN', kind: 'rust', policy: 'owed', guard: 'two-way', owner: 'tests/corpus.rs' },
  { repo: 'carve-rs', path: 'tests/corpus_canonical_form.rs', name: 'AHEAD_OF_PIN', kind: 'rust', policy: 'owed', guard: 'two-way', owner: 'tests/corpus_canonical_form.rs' },
  { repo: 'carve-rs', path: 'tests/corpus_render_fixtures.rs', name: 'FMT_AHEAD_OF_PIN', kind: 'rust', policy: 'owed', guard: 'two-way', staleness: 'the pin has caught up; delete its FMT_AHEAD_OF_PIN entry', owner: 'tests/corpus_render_fixtures.rs' },
  { repo: 'carve-rs', path: 'tests/optional_corpus.rs', name: 'DECLARED_UNIMPLEMENTED', kind: 'rust', policy: 'owed', guard: 'two-way', owner: 'tests/optional_corpus.rs' },
  { repo: 'carve-rs', path: 'tests/optional_corpus.rs', name: 'AHEAD_OF_PIN', kind: 'rust', policy: 'owed', guard: 'two-way', owner: 'tests/optional_corpus.rs' },
  { repo: 'carve-rs', path: 'tests/html_import.rs', name: 'AHEAD_OF_PIN',      kind: 'rust', policy: 'owed', guard: 'two-way', owner: 'mirrors spec PIN_LAG' },
  // Not a waiver: the set of JSON Schema keywords this hand-written validator
  // implements. Meeting one that is NOT listed is the failure, which is the
  // opposite direction from every other row here.
  { repo: 'carve-rs', path: 'tests/the_report_answers_to_the_published_schema.rs', name: 'KNOWN_KEYWORDS', kind: 'rust', policy: 'permitted', guard: 'two-way', owner: 'validator capability list, not an exemption' },
]

/**
 * Declaration-shaped names, for the sweep that catches a list this manifest
 * does not know about. Deliberately narrow: a list that silences a comparison
 * is named for what it excuses, and these are the shapes this org uses.
 */
const DECLARATION_NAME = /(?:^|_)(?:PIN_LAG|AHEAD_OF_PIN|BEHIND_THE_RULING|UNMET|LAST_MEASURED|DECLARED_[A-Z_]+|KNOWN_[A-Z_]+|[A-Z_]*?(?:GAPS|DIVERGENCES|WAIVERS|LOSSES|PENDING|REMAINING|OVER_REACH|UNIMPLEMENTED))(?:_|$)/
const isDeclarationName = (name) => DECLARATION_NAME.test(name)

/** Classify `git rev-list --left-right --count PIN...MAIN`. */
function classifyPinDistance(pinOnly, mainOnly) {
  if (!Number.isSafeInteger(pinOnly) || pinOnly < 0 || !Number.isSafeInteger(mainOnly) || mainOnly < 0) {
    return 'unverifiable'
  }
  if (pinOnly === 0 && mainOnly === 0) return 'current'
  if (pinOnly === 0) return 'behind'
  if (mainOnly === 0) return 'ahead'
  return 'diverged'
}

function pinnedCarveJsSha() {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
    const value = pkg.devDependencies?.['@markup-carve/carve']
    const match = typeof value === 'string' && value.match(/#([0-9a-f]{40})$/i)
    return match ? match[1].toLowerCase() : new Error('package.json does not pin @markup-carve/carve to an exact 40-character SHA')
  } catch (error) {
    return new Error(`cannot read the carve-js pin: ${error.message}`)
  }
}

function gitPinStatus(dir, pin, mainRef = 'origin/main') {
  try {
    execFileSync('git', ['-C', dir, 'cat-file', '-e', `${pin}^{commit}`], { stdio: 'ignore' })
    const main = execFileSync('git', ['-C', dir, 'rev-parse', '--verify', `${mainRef}^{commit}`], { encoding: 'utf8' }).trim()
    const counts = execFileSync('git', ['-C', dir, 'rev-list', '--left-right', '--count', `${pin}...${main}`], { encoding: 'utf8' })
      .trim()
      .split(/\s+/)
      .map(Number)
    return { pin, main, pinOnly: counts[0], mainOnly: counts[1], relation: classifyPinDistance(counts[0], counts[1]) }
  } catch (error) {
    return new Error(`cannot compare pin ${pin} with carve-js ${mainRef}: ${error.message}`)
  }
}

function carveJsPinStatus(dir, mainRef = 'origin/main') {
  const pin = pinnedCarveJsSha()
  return pin instanceof Error ? pin : gitPinStatus(dir, pin, mainRef)
}

/** Test trees to sweep, per repo. */
const TEST_DIRS = {
  spec: ['tests'],
  'carve-js': ['test'],
  'carve-php': ['tests'],
  'carve-rs': ['tests'],
}

/* ------------------------------------------------------------- extraction */

/**
 * Blank every comment, keeping the file's length so offsets still line up.
 *
 * String-aware, because a `//` inside a URL literal is not a comment and
 * blanking from there would swallow the rest of the line - including the
 * closing bracket this scanner is looking for.
 */
function blankComments(src, lang) {
  // `split('')`, NOT `[...src]`. The spread splits by code POINT and `src[i]`
  // indexes code UNITS, so one astral character (an emoji in a symbol-map
  // fixture, say) shortens the array and every later write lands one slot
  // early - blanking live code and reporting a constant as deleted. Measured
  // on tests/optional-corpus.test.mjs, whose symbol map carries four emoji.
  const out = src.split('')
  let i = 0
  const hashComments = lang === 'php'
  while (i < src.length) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      i += 1
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === quote) { i += 1; break }
        i += 1
      }
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') { out[i] = ' '; i += 1 }
      continue
    }
    if (hashComments && c === '#') {
      while (i < src.length && src[i] !== '\n') { out[i] = ' '; i += 1 }
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] !== '\n') out[i] = ' '
        i += 1
      }
      out[i] = ' '; out[i + 1] = ' '
      i += 2
      continue
    }
    i += 1
  }
  return out.join('')
}

/** The declaration site of `name`, or -1. Matches all four languages' spellings. */
function declarationIndex(src, name) {
  const patterns = [
    new RegExp(`\\bconst\\s+${name}\\b`),           // js, ts, rust
    new RegExp(`\\bconst\\s+${name}\\s*=`),         // php class constant
    new RegExp(`\\bstatic\\s+${name}\\b`),
  ]
  for (const re of patterns) {
    const m = re.exec(src)
    if (m) return m.index
  }
  return -1
}

/**
 * Step over `new Map<...>` / `new Set<...>` before the literal starts.
 *
 * TypeScript writes the element type in the CONSTRUCTOR's type arguments -
 * `new Map<string, { reason: string; html: string }>([])` - and a scan for the
 * first brace lands in that type object and counts its two fields as two live
 * rows. Every empty TS collection read as 1 before this.
 */
function afterConstructor(src, from) {
  let i = from
  while (i < src.length && /\s/.test(src[i])) i += 1
  const m = /^new\s+[A-Za-z_$][\w$]*\s*/.exec(src.slice(i))
  if (!m) return from
  i += m[0].length
  if (src[i] !== '<') return i
  let depth = 0
  while (i < src.length) {
    if (src[i] === '<') depth += 1
    else if (src[i] === '>') { depth -= 1; if (depth === 0) return i + 1 }
    i += 1
  }
  return from
}

/** From `from`, the first `[` or `{` and the index just past its match. */
function bracketedBlock(src, from) {
  const openers = { '[': ']', '{': '}', '(': ')' }
  let i = from
  while (i < src.length && !(src[i] in openers)) {
    if (src[i] === ';' || src[i] === '\n' && src[i + 1] === '\n') return null
    i += 1
  }
  if (i >= src.length) return null
  const start = i
  const stack = [openers[src[i]]]
  i += 1
  while (i < src.length && stack.length > 0) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      i += 1
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === quote) { i += 1; break }
        i += 1
      }
      continue
    }
    if (c in openers) stack.push(openers[c])
    else if (c === stack[stack.length - 1]) stack.pop()
    i += 1
  }
  if (stack.length > 0) return null
  return { inner: src.slice(start + 1, i - 1), end: i }
}

/** Split on depth-0 commas, drop empties. Handles trailing commas by construction. */
function topLevelEntries(inner) {
  const parts = []
  let depth = 0
  let current = ''
  let i = 0
  while (i < inner.length) {
    const c = inner[i]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      let literal = c
      i += 1
      while (i < inner.length) {
        literal += inner[i]
        if (inner[i] === '\\') { literal += inner[i + 1] ?? ''; i += 2; continue }
        if (inner[i] === quote) { i += 1; break }
        i += 1
      }
      current += literal
      continue
    }
    if ('[{('.includes(c)) depth += 1
    else if (']})'.includes(c)) depth -= 1
    if (c === ',' && depth === 0) { parts.push(current); current = ''; i += 1; continue }
    current += c
    i += 1
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

/** Rows of a `.txt` ledger: every line that is neither blank nor a `#` comment. */
function txtRows(src) {
  return src.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '' && !l.trimStart().startsWith('#'))
}

/**
 * The rows of a drift ledger that are NOT declarations.
 *
 * This is what the `declared` policy judges, and it is what keeps the per-PR
 * leniency from being a check that cannot fail. A ledger row is a declaration
 * only if it says something: the format is `<slug><two or more spaces><reason>`
 * and a bare slug is a window TOLERATED rather than declared, which is the
 * distinction the ledger's own header draws. A key listed twice is worse than
 * unparseable - both lines parse, and the reason a human wrote first is
 * discarded unread (carve#1479).
 *
 * Duplicate detection comes from scripts/lib/drift-ledger.mjs rather than being
 * spelled again here, so "what counts as a duplicate" has exactly one
 * definition in this repo.
 *
 * @param {Array<string>} rows
 * @returns {Array<string>} one line per fault, empty when every row declares.
 */
function undeclaredLedgerRows(rows) {
  const faults = []
  const keys = []
  for (const row of rows) {
    const at = row.search(/\s{2,}/)
    if (at === -1) {
      faults.push(`${row}   <- no reason given: a bare slug is a window TOLERATED, not declared`)
      continue
    }
    keys.push(row.slice(0, at))
  }
  for (const key of duplicateKeys(keys)) {
    faults.push(`${key}   <- listed twice: one of the two reasons is discarded unread (carve#1479)`)
  }
  return faults
}

/**
 * A single-string lag constant. The VALUE is the declaration, so a non-empty
 * string is one row and a deleted constant is zero.
 */
function stringRows(src, name) {
  const at = declarationIndex(src, name)
  if (at === -1) return null
  const rest = src.slice(at)
  // Up to the first line break that does not continue an expression.
  const lines = rest.split('\n')
  let value = ''
  for (const line of lines) {
    value += line
    const trimmed = line.trimEnd()
    if (!trimmed.endsWith('+') && !trimmed.endsWith('=') && (value.match(/'/g)?.length ?? 0) % 2 === 0) break
  }
  const literals = [...value.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => m[1] ?? m[2])
    .join('')
  return literals.trim() === '' ? [] : [literals.slice(0, 120)]
}

const LANG_OF = { js: 'js', 'js-string': 'js', php: 'php', rust: 'rust' }

/** Live rows for one manifest entry, or an Error explaining why not. */
function liveRows(entry, src) {
  if (entry.kind === 'txt') return txtRows(src)
  if (entry.kind === 'json') {
    let node
    try { node = JSON.parse(src) } catch (error) { return new Error(`invalid JSON: ${error.message}`) }
    for (const key of entry.name.split('.')) {
      if (node === null || typeof node !== 'object' || !(key in node)) {
        return new Error(`no ${entry.name} in this file - renamed, moved, or deleted`)
      }
      node = node[key]
    }
    if (!Array.isArray(node)) return new Error(`${entry.name} is not an array`)
    return node.map(String)
  }
  const clean = blankComments(src, LANG_OF[entry.kind])
  if (entry.kind === 'js-string') {
    const rows = stringRows(clean, entry.name)
    if (rows === null) {
      return entry.optional ? [] : new Error(`no declaration of ${entry.name}`)
    }
    return rows
  }
  const at = declarationIndex(clean, entry.name)
  if (at === -1) return new Error(`no declaration of ${entry.name} - renamed, moved, or deleted`)
  // Start at the `=`, not at the name. Rust spells the TYPE between them -
  // `const AHEAD_OF_PIN: &[(&str, &str, &str)] = &[];` - and a scan from the
  // name lands in `&[(&str, ...)]` and reports the type as one live row. Every
  // empty Rust list read as 1 before this.
  const assign = clean.indexOf('=', at + entry.name.length)
  if (assign === -1) return new Error(`no initializer for ${entry.name}`)
  const block = bracketedBlock(clean, afterConstructor(clean, assign + 1))
  if (block === null) return new Error(`could not find a balanced literal for ${entry.name}`)
  // `new Map([...])` / `new Set([...])` wrap the real list one level down.
  const outer = topLevelEntries(block.inner)
  const inner = outer.length === 1 && /^\[[\s\S]*\]$/.test(outer[0])
    ? topLevelEntries(outer[0].slice(1, -1))
    : outer
  return inner.map((row) => row.replace(/\s+/g, ' ').slice(0, 120))
}

/* ------------------------------------------------------------------ input */

function read(repo, path) {
  const info = REPOS[repo]
  if (!info || !existsSync(info.dir)) return new Error(`checkout not found: ${info?.dir ?? repo}`)
  if (info.alwaysWorktree || ref === 'worktree') {
    const full = join(info.dir, path)
    if (!existsSync(full)) return new Error(`file not found: ${full}`)
    return readFileSync(full, 'utf8')
  }
  try {
    return execFileSync('git', ['-C', info.dir, 'show', `${ref}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch (error) {
    return new Error(`git show ${ref}:${path} failed in ${info.dir}: ${String(error.message).split('\n')[0]}`)
  }
}

function listFiles(repo, dir) {
  const info = REPOS[repo]
  if (info.alwaysWorktree || ref === 'worktree') {
    const out = []
    const walk = (d) => {
      for (const name of readdirSync(d)) {
        const full = join(d, name)
        if (name === 'spec' || name === 'node_modules' || name === 'vendor' || name === 'target') continue
        if (statSync(full).isDirectory()) walk(full)
        else out.push(full.slice(info.dir.length + 1))
      }
    }
    const base = join(info.dir, dir)
    if (existsSync(base)) walk(base)
    return out
  }
  try {
    return execFileSync('git', ['-C', info.dir, 'ls-tree', '-r', '--name-only', ref, '--', dir], { encoding: 'utf8' })
      .split('\n').filter(Boolean)
  } catch { return [] }
}

/* ------------------------------------------------------------------- main */

export const __internals = { blankComments, declarationIndex, bracketedBlock, topLevelEntries, liveRows, classifyPinDistance, gitPinStatus, isDeclarationName, undeclaredLedgerRows, MANIFEST }

if (process.env.CARVE_DECL_AUDIT_LIB === '1') {
  // Imported for its helpers by the self-test; do not run the audit.
} else {


if (doFetch) {
  for (const [name, info] of Object.entries(REPOS)) {
    if (info.alwaysWorktree || !existsSync(info.dir)) continue
    try {
      execFileSync('git', ['-C', info.dir, 'fetch', '--quiet', 'origin', 'main'], { stdio: 'ignore' })
    } catch {
      console.error(`  ! could not fetch origin/main in ${name} - reading whatever ${ref} resolves to`)
    }
  }
}

let failed = 0
const skipped = []
const unwired = []
const verifiedGuards = []
const claimedGuards = []
const manualRows = []
const rowsFor = new Map()

const width = { repo: 9, path: 60, name: 32, rows: 20 }
const pad = (s, n) => String(s).padEnd(n).slice(0, n)

const MODE_BANNER = strict
  ? 'RELEASE - is this tree clear to tag? Every owed list must be empty and the pin current.'
  : 'PER-PR - is this pull request defective? A declared engine-pin window passes; pin staleness reports.'
console.log(`Declaration audit - mode ${mode.toUpperCase()}`)
console.log(`  ${MODE_BANNER}`)
console.log(`  spec repo from this worktree, engines from ${ref}\n`)

// A stale pin is a RELEASE fault and a per-PR fact. It goes stale on every
// carve-js merge, so gating a spec PR on it makes the pin bump a prerequisite
// for landing a ruling, and a repo that is red as routine hides a regression in
// the noise (carve#1811). The pre-tag run still fails on it.
const pinVerdictIsGated = strict
const pinNote = pinVerdictIsGated ? '' : ' (reported, not gated in per-PR mode)'
const pinStatus = carveJsPinStatus(REPOS['carve-js'].dir, ref === 'worktree' ? 'HEAD' : ref)
if (pinStatus instanceof Error) {
  console.log(`PIN STALENESS  UNVERIFIABLE - ${pinStatus.message}${pinNote}\n`)
  if (pinVerdictIsGated) failed += 1
} else if (pinStatus.relation !== 'current') {
  console.log(
    `PIN STALENESS  ${pinStatus.relation.toUpperCase()} - @markup-carve/carve ${pinStatus.pin.slice(0, 8)} ` +
      `vs carve-js ${ref} ${pinStatus.main.slice(0, 8)} ` +
      `(pin-only ${pinStatus.pinOnly}, main-only ${pinStatus.mainOnly})${pinNote}\n`,
  )
  if (pinVerdictIsGated) failed += 1
} else {
  console.log(`PIN STALENESS  current at carve-js ${pinStatus.main.slice(0, 8)}\n`)
}
console.log(`${pad('repo', width.repo)} ${pad('file', width.path)} ${pad('constant', width.name)} ${pad('rows', width.rows)} policy     guard`)
console.log('-'.repeat(width.repo + width.path + width.name + width.rows + 24))

for (const entry of MANIFEST) {
  const src = read(entry.repo, entry.path)
  const label = `${pad(entry.repo, width.repo)} ${pad(entry.path, width.path)} ${pad(entry.name ?? '-', width.name)}`
  if (src instanceof Error) {
    // "There is no sibling clone of carve-rs on this machine" is a fact about
    // the machine, not a finding about the pull request: without siblings 25 of
    // the 26 rows below go UNREACHABLE and the run reports 26 findings that
    // name nothing anyone changed. The pre-tag run still fails - a release
    // verdict computed from three engines it could not read is worthless -
    // and a MISSING FILE inside a checkout that IS present still fails in
    // both modes, which is what CI actually exercises.
    const checkoutMissing = !existsSync(REPOS[entry.repo].dir)
    if (!strict && entry.repo !== 'spec' && checkoutMissing) {
      console.log(`${label} ${pad('--', width.rows)} SKIPPED      no ${entry.repo} checkout at ${REPOS[entry.repo].dir}`)
      skipped.push(entry.repo)
      continue
    }
    console.log(`${label} ${pad('??', width.rows)} UNREACHABLE  ${src.message}`)
    failed += 1
    continue
  }
  const rows = liveRows(entry, src)
  if (rows instanceof Error) {
    console.log(`${label} ${pad('??', width.rows)} UNPARSEABLE  ${rows.message}`)
    failed += 1
    continue
  }
  rowsFor.set(`${entry.repo}:${entry.path}:${entry.name ?? '-'}`, rows)

  // The verdict, not the entry, is what the mode changes. `prPolicy` applies
  // only in `per-pr` mode and only where the manifest opted in (carve#1811).
  const policy = !strict && entry.prPolicy !== undefined ? entry.prPolicy : entry.policy

  let owed = rows.length
  let permitted = 0
  let detail = rows
  if (policy === 'split') {
    permitted = rows.filter((r) => r.trim().split(/\s+/).at(-1) === 'permitted').length
    owed = rows.length - permitted
  } else if (policy === 'permitted') {
    permitted = rows.length
    owed = 0
  } else if (policy === 'manual') {
    owed = 0
  } else if (policy === 'declared') {
    detail = undeclaredLedgerRows(rows)
    owed = detail.length
    permitted = rows.length - owed
  }

  const verdict = policy === 'split' || policy === 'declared'
    ? `${rows.length} (${permitted} ${policy === 'declared' ? 'declared' : 'permitted'})`
    : String(rows.length)
  const bad = owed > 0
  const flag = bad ? (policy === 'declared' ? '   <== UNDECLARED' : '   <== OWED') : ''
  console.log(`${label} ${pad(verdict, width.rows)} ${pad(policy, 10)} ${entry.guard}${flag}`)
  if (bad) {
    failed += 1
    for (const row of detail.slice(0, 25)) console.log(`${' '.repeat(12)}| ${row}`)
    console.log(`${' '.repeat(12)}` + `owner: ${entry.owner}`)
  } else if (policy === 'declared' && rows.length > 0) {
    // Say out loud that the other direction is still gated, and by what,
    // because a declared window otherwise reads as "the audit stopped caring".
    console.log(`${' '.repeat(12)}declared window of ${rows.length} row(s); undeclared drift is gated by ${entry.owner}`)
  }
  if (policy === 'manual' && rows.length > 0) manualRows.push({ entry, rows })
  if (entry.guard !== 'two-way') unwired.push({ entry, count: rows.length })
  // THE CLAIM, CHECKED. `guard` describes the file; `staleness` is the string
  // that proves it is still there. A named anchor that has gone is a guard that
  // was removed, and the manifest would otherwise keep vouching for it.
  else if (entry.staleness !== undefined) {
    if (src.includes(entry.staleness)) verifiedGuards.push(entry)
    else {
      console.log(`${' '.repeat(12)}GUARD GONE: ${entry.path} no longer contains ${JSON.stringify(entry.staleness)}`)
      failed += 1
    }
  } else claimedGuards.push(entry)
}

/* ------ the sweep that keeps the manifest itself from going stale --------- */

const declared = new Set(MANIFEST.map((e) => `${e.repo}:${e.path}:${e.name ?? '-'}`))
const undeclared = []
for (const [repo, dirs] of Object.entries(TEST_DIRS)) {
  if (!existsSync(REPOS[repo].dir)) continue
  for (const dir of dirs) {
    for (const path of listFiles(repo, dir)) {
      if (!/\.(mjs|js|ts|php|rs)$/.test(path)) continue
      const src = read(repo, path)
      if (src instanceof Error) continue
      const clean = blankComments(src, LANG_OF[path.endsWith('.php') ? 'php' : path.endsWith('.rs') ? 'rust' : 'js'])
      for (const m of clean.matchAll(/\b(?:const|static)\s+([A-Z][A-Z0-9_]{3,})\b/g)) {
        const name = m[1]
        if (!isDeclarationName(name)) continue
        const key = `${repo}:${path}:${name}`
        if (!declared.has(key)) undeclared.push(key)
      }
    }
  }
}

console.log()
if (manualRows.length > 0) {
  console.log('MANUAL - no mechanical rule separates permitted from owed here. Read these:')
  for (const { entry, rows } of manualRows) {
    console.log(`  ${entry.repo} ${entry.path} :: ${entry.name}`)
    for (const row of rows) console.log(`      ${row}`)
  }
  console.log()
}

if (unwired.length > 0) {
  console.log('UNWIRED GUARDS - these lists cannot report a STALE row, empty or not:')
  for (const { entry, count } of unwired) {
    console.log(`  [${entry.guard}] ${entry.repo} ${entry.path} :: ${entry.name} (${count} row(s)) - ${entry.owner}`)
  }
  console.log('  A list with no staleness half is a check that cannot fail (markup-carve/carve#755).')
  console.log()
  // A non-empty list with no way to detect a stale row is the exact defect this
  // audit exists to find, so it fails rather than warns.
  for (const { count } of unwired) if (count > 0) failed += 1
}

console.log(
  `GUARDS: ${verifiedGuards.length} verified against a named assertion, ` +
    `${claimedGuards.length} claimed but unverified, ${unwired.length} not two-directional.`,
)
console.log()

if (undeclared.length > 0) {
  console.log('UNDECLARED - declaration-shaped constants this manifest does not name:')
  for (const key of [...new Set(undeclared)].sort()) console.log(`  ${key}`)
  console.log('  Add each to MANIFEST with its policy and guard, or rename it if it is not a declaration.')
  console.log()
  failed += 1
}

if (skipped.length > 0) {
  const missing = [...new Set(skipped)].sort()
  console.log(
    `SKIPPED - ${missing.join(', ')} not checked out, so their rows were not read. ` +
      'A per-PR run without sibling engine checkouts is INCOMPLETE, not clean.',
  )
  console.log()
}

if (failed > 0) {
  console.log(
    `DECLARATION AUDIT FAILED (mode: ${mode}) - ${failed} finding(s). ` +
      (strict ? 'Not clear to tag.' : 'This pull request has a declaration finding to fix.'),
  )
  process.exit(1)
}
console.log(
  `DECLARATION AUDIT PASSED (mode: ${mode}) - ` +
    (strict
      ? 'every owed list is empty, the pin is current, and every guard is two-directional.'
      : 'every owed list is empty, every engine-lag window is declared, and every guard is two-directional.'),
)
}
