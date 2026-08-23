/*
 * The verdict a Tier-3 example gets when it disagrees with the pinned build.
 *
 * `resources/examples-tier3.md` is compared LIVE - there is no committed golden
 * beside it, only the ` ```html ` fence in the file itself - so for as long as
 * the pin is behind a ruling, the file agrees with the engine and the run is
 * green while recording the PRE-RULING reading as correct. The disagreement
 * surfaces only at the next pin bump, as a diff in a file full of unrelated
 * examples, at the moment somebody is landing a routine bump (carve#1512).
 *
 * And the diff arrives with no way to read it: "the ruling landed" and "the
 * engine regressed" are the same diff. That is why re-snapshotting is the wrong
 * reflex and not merely a lazy one - it answers a question nobody asked, and
 * `resources/examples-tier3.md` has been re-snapshotted that way once already
 * (carve#1478 moved the CodeGroup wrapper and the Index back-link).
 *
 * So the window is DECLARED, on the model `tests/optional-corpus.test.mjs` uses
 * for the Tier-2 corpus: the fence states what the SPEC states, and the ledger
 * says the pinned build has not shipped it yet.
 *
 * AN ENTRY DECLARES THE GAP, NOT MERELY THAT THERE IS ONE. The Tier-2 ledger
 * asserts `notEqual`, which is enough to make the window visible but turns the
 * declared case into the only unverified case in the file: while the entry
 * lives, ANY output that is not the spec's passes, so an unrelated regression
 * in that section lands inside the declaration and is read as "still behind".
 * An entry here therefore carries the SUBSTITUTIONS that turn the spec bytes
 * into the pinned bytes - one per thing the ruling changed - and the comparison
 * stays exact in both readings. There is no second golden to maintain: the
 * substitutions ARE the ruling's delta, spelled once, and they are deleted with
 * the entry.
 *
 * That gives three distinguishable states instead of two:
 *
 *   - the build emits the spec's bytes    -> the pin caught up. Delete the
 *     entry, in the commit that moves the pin.
 *   - the build emits the declared bytes  -> the window is open and described.
 *   - the build emits neither             -> something moved that nobody
 *     declared. That is a finding whether or not this section was behind.
 *
 * And undeclared, the plain disagreement asks for a decision rather than a
 * re-snapshot: either a ruling landed (declare it) or the engine moved under
 * the fixture (that is the finding). Rewriting the fence makes both go away
 * unread.
 *
 * The functions are here rather than inline in the test because a check that
 * only ever ran against the real file could not be shown to fail in any of
 * those directions - which is the carve#755 shape this repo keeps producing.
 * They are pure, and
 * `tests/a-tier3-example-ahead-of-the-pin-is-declared.test.mjs` feeds them every
 * branch.
 */

/**
 * @typedef {{reason: string, pinned: Array<[string, string]>}} Tier3Entry
 *   `pinned` maps a fragment of the SPEC bytes to what the pinned build writes
 *   there instead. Applied in order to the fence, it produces what the build is
 *   expected to emit today.
 */

/**
 * @param {string} expected the fence, stating the spec.
 * @param {Array<[string, string]>} pinned
 * @returns {{behind: string, unused: Array<string>}}
 */
function applyDeclaredGap(expected, pinned) {
  let behind = expected
  const unused = []
  for (const [spec, build] of pinned) {
    if (!behind.includes(spec)) {
      unused.push(spec)
      continue
    }
    behind = behind.split(spec).join(build)
  }
  return { behind, unused }
}

/**
 * @param {{section: string, rendered: string, expected: string, entry?: Tier3Entry}} spec
 * @returns {string | null} a finding, or null when the example is where it should be
 */
export function tier3Verdict({ section, rendered, expected, entry }) {
  if (!entry) {
    if (rendered === expected) return null
    return (
      `${section}: the pinned build does not reproduce this example.\n` +
      `Two different things look exactly like this diff, and only one of them is settled:\n` +
      `  - a ruling landed and the example states it -> add an AHEAD_OF_PIN entry naming ` +
      `the ruling, and declaring what the build writes instead.\n` +
      `  - the engine moved and nobody decided that  -> that IS the finding; rule on it ` +
      `before any byte here moves.\n` +
      `Rewriting the html fence to whatever the build emits closes the case without ` +
      `either decision being made, which is what carve#1512 is about.`
    )
  }

  if (!Array.isArray(entry.pinned) || entry.pinned.length === 0) {
    return (
      `${section}: its AHEAD_OF_PIN entry declares no substitution, so it says only THAT ` +
      `the build disagrees and never what it writes instead. Every other output then ` +
      `passes inside the declaration, which is the one thing a ledger must not buy.`
    )
  }

  const { behind, unused } = applyDeclaredGap(expected, entry.pinned)
  if (unused.length > 0) {
    return (
      `${section}: its AHEAD_OF_PIN entry declares a substitution the html fence does not ` +
      `contain, so that part of the gap is described against nothing:\n` +
      unused.map((spec) => `  ${JSON.stringify(spec)}`).join('\n') +
      `\nThe fence states the spec; a substitution names a fragment OF it.`
    )
  }

  if (rendered === expected) {
    return (
      `${section}: the pinned build reproduces this example now, so its AHEAD_OF_PIN ` +
      `entry is a statement about an engine that has caught up. Delete the entry in ` +
      `the commit that moves the pin.\n` +
      `  declared: ${entry.reason}`
    )
  }

  if (rendered !== behind) {
    return (
      `${section}: the pinned build writes neither what the fence states nor what its ` +
      `AHEAD_OF_PIN entry says it writes instead, so something moved that nobody ` +
      `declared. A declared window is not a licence for the rest of the section.\n` +
      `  declared: ${entry.reason}\n` +
      `  expected of the pinned build:\n${behind}\n` +
      `  actually emitted:\n${rendered}`
    )
  }

  return null
}

/**
 * Ledger keys that name no section in the file.
 *
 * A key that reaches nothing is an entry nobody can delete and coverage nobody
 * gets: the section it meant is compared normally, so the window it declares is
 * undeclared again. Renaming a `##` heading is all it takes.
 *
 * The population is the LOCAL file, deliberately - not a manifest the pinned
 * build supplies. carve-js#1287 found the sibling guard there keyed to the
 * pinned manifest, so its ledger could not hold a case the pin had never seen,
 * which is the one case a ledger about being ahead of the pin exists for. Here
 * the same commit that adds a section can declare it.
 *
 * @param {Iterable<string>} ledgerKeys
 * @param {Iterable<string>} sections
 * @returns {Array<string>}
 */
export function deadLedgerKeys(ledgerKeys, sections) {
  const known = new Set(sections)
  return [...ledgerKeys].filter((key) => !known.has(key)).sort()
}
