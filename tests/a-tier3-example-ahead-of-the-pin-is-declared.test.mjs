/*
 * The Tier-3 ledger is pinned in EVERY direction, because a ledger that only
 * fails one way is a skip list wearing a ledger's name.
 *
 * `resources/examples-tier3.md` has no committed golden - the ` ```html ` fence
 * is compared live against the pinned build - so while the pin sits behind a
 * ruling the file agrees with the engine and the run is green over the
 * PRE-RULING bytes. Nothing could report that state, and the disagreement
 * arrived only at the next bump, in a file full of unrelated examples, where the
 * cheapest reading is "re-snapshot it" (carve#1512).
 *
 * `scripts/lib/tier3-ledger.mjs` makes the window an object with a name. This
 * file is why that is a check and not a decoration: the real file can only ever
 * exercise the branch it happens to be in today, so every branch is fed here
 * explicitly. It is the carve#755 discipline applied to the guard itself -
 * eleven checks in this repo could not fail, and each one looked exactly like a
 * check that passed.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deadLedgerKeys, tier3Verdict } from '../scripts/lib/tier3-ledger.mjs'

const CodeGroup = 'CodeGroup'
const spec = '<div class="code-group-panel" role="group" aria-label="JavaScript">js</div>'
const pinned = '<div class="code-group-panel">js</div>'
const entry = {
  reason: "carve#1489 Extensions §13.2 - the panel takes its tab's name",
  pinned: [['<div class="code-group-panel" role="group" aria-label="JavaScript">', '<div class="code-group-panel">']],
}

test('a declared example the pinned build has caught up on fails, and demands the entry go', () => {
  const finding = tier3Verdict({ section: CodeGroup, rendered: spec, expected: spec, entry })
  assert.notEqual(finding, null, 'an entry the pin reproduces must not pass - that is how a ledger empties')
  assert.match(finding, /reproduces this example now/)
  assert.match(finding, /Delete the entry in the commit that moves the pin/)
  // The reason travels with the finding: whoever deletes the entry is the one
  // who has to know which ruling it claimed, and re-reading the source for it
  // is exactly the step the optional corpus lost track of once already.
  assert.match(finding, /carve#1489/)
})

test('a declared example the pinned build still writes the declared way passes', () => {
  assert.equal(tier3Verdict({ section: CodeGroup, rendered: pinned, expected: spec, entry }), null)
})

test('a declared example whose build writes a THIRD thing fails, declaration or not', () => {
  // The hole a bare `notEqual` leaves: while the entry lives, every output that
  // is not the spec's passes, so the one section with a declared window is the
  // one section nothing verifies. An unrelated regression lands inside the
  // declaration and reads as "still behind".
  const regressed = '<div class="code-group-panel" role="group" aria-label="Python">js</div>'
  const finding = tier3Verdict({ section: CodeGroup, rendered: regressed, expected: spec, entry })
  assert.notEqual(finding, null, 'a declared window is not a licence for the rest of the section')
  assert.match(finding, /writes neither what the fence states nor what its AHEAD_OF_PIN entry says/)
  assert.match(finding, /carve#1489/)
})

test('an entry declaring no substitution is refused', () => {
  // It would be the bare `notEqual` again, written as a ledger entry.
  const finding = tier3Verdict({ section: CodeGroup, rendered: pinned, expected: spec, entry: { reason: 'x', pinned: [] } })
  assert.notEqual(finding, null)
  assert.match(finding, /declares no substitution/)
})

test('an entry declaring a fragment the fence does not contain is refused', () => {
  // A substitution keyed on bytes that are not in the fence describes nothing,
  // and would leave the section compared against an unchanged `behind` - i.e.
  // against the spec, which is the state the entry exists to say it is not in.
  const stale = { reason: 'x', pinned: [['<div class="tabs-panel">', '<div>']] }
  const finding = tier3Verdict({ section: CodeGroup, rendered: pinned, expected: spec, entry: stale })
  assert.notEqual(finding, null)
  assert.match(finding, /declares a substitution the html fence does not contain/)
  assert.match(finding, /tabs-panel/)
})

test('an undeclared example the pinned build disagrees with fails, and demands a decision', () => {
  const finding = tier3Verdict({ section: CodeGroup, rendered: pinned, expected: spec })
  assert.notEqual(finding, null, 'an undeclared disagreement is the state this ledger exists to surface')
  assert.match(finding, /does not reproduce this example/)
  assert.match(finding, /add an AHEAD_OF_PIN entry naming the ruling/)
  // The half a re-snapshot silently answers. A message that offered only the
  // "declare it" branch would still teach the reflex, in a nicer voice.
  assert.match(finding, /the engine moved and nobody decided that/)
  assert.match(finding, /Rewriting the html fence/)
})

test('an undeclared example the pinned build reproduces passes', () => {
  assert.equal(tier3Verdict({ section: CodeGroup, rendered: spec, expected: spec }), null)
})

test('the comparison is exact, so a whitespace-only difference is still a difference', () => {
  // The live comparison never trimmed, and this keeps it from starting to: a
  // Tier-3 fence pins block indentation, which is the one thing §7.5 and §8.4
  // name as the reason these are not corpus-pinned in the first place.
  assert.notEqual(tier3Verdict({ section: CodeGroup, rendered: `${spec}\n`, expected: spec }), null)
  assert.notEqual(tier3Verdict({ section: CodeGroup, rendered: `${pinned}\n`, expected: spec, entry }), null)
})

test('a ledger key naming no section is refused, and a key naming one is not', () => {
  const sections = ['MathBlock', CodeGroup, 'Index']
  assert.deepEqual(deadLedgerKeys(['Codegroup'], sections), ['Codegroup'])
  assert.deepEqual(deadLedgerKeys([CodeGroup], sections), [])
  // Sorted, and every dead key reported rather than the first: a rename sweep
  // leaves several at once and fixing them one run at a time is the slow way.
  assert.deepEqual(deadLedgerKeys(['Tabs', 'Codegroup'], sections), ['Codegroup', 'Tabs'])
})

test('the ledger can declare a section the pinned build has never seen', () => {
  // The limitation carve-js#1287 found in the sibling guard: keyed to the
  // manifest the PINNED build states, it could not hold a case the pin had not
  // shipped - the only case a ledger about being ahead of the pin is for. Here
  // the population is the local file, so a section added in this commit is
  // declarable in this commit.
  assert.deepEqual(deadLedgerKeys(['BrandNewExtension'], ['MathBlock', 'BrandNewExtension']), [])
})
