/*
 * The one window a BINDING is allowed to be behind in, declared rather than
 * tolerated.
 *
 * `ast:check` compares carve-rb's tree against carve-rs's and gates on any
 * difference, for the reason stated where it does it: a binding serializes
 * carve-rs's tree, so it has no vote of its own and there is no window in which
 * it is the one that is right. That is true of the BINDING. It is not true of
 * the PIN. `carve-rb/ext/carve/Cargo.toml` names a PUBLISHED crate by org
 * policy and the job builds carve-rs from MAIN, so between a merge and a
 * release the two are supposed to differ and there is nowhere for the pin to
 * move (carve-rb#142, carve#2175).
 *
 * So the pin window is declared, per document, and the declaration is refused
 * the moment it stops describing the world:
 *
 *   - the pin caught up (pinned === built)  -> the window closed; every row is
 *     a row about nothing, whatever it says.
 *   - the pin MOVED but still lags          -> every row names the version it
 *     was measured against, so a row about `=0.1.6` fails once the pin reads
 *     `=0.1.7`. Re-measure; do not repoint the text.
 *   - a document drifts and is not listed   -> a gap in the BINDING, which no
 *     pin explains. Red immediately, which is the point.
 *   - a listed document reproduces again    -> the window moved past it; delete
 *     the row.
 *
 * A DOCUMENT THE RUN DID NOT REACH IS NOT A ROW THAT REPRODUCES. `ast:check`
 * takes `--satellite-limit`, and a sliced run sees a declared document not
 * drifting because it never compared it. Reporting that as "delete the row"
 * pointed a reader at a deletion the measurement cannot support - the same
 * defect `unusedConverterDeclaration` exists to avoid - so the two are
 * separate answers and only one of them fails.
 */

/**
 * @param {Iterable<string>} drifted documents carve-rb does not reproduce.
 * @param {Map<string, string>} declared ledger rows: document to reason.
 * @param {Iterable<string>} measured documents this run actually compared.
 * @param {{ pinned: string|null, built: string|null }} versions read off the
 *   two checkouts: carve-rb's pin and carve-rs's own `Cargo.toml`.
 * @returns {{ problems: Array<string>, notes: Array<string> }}
 */
export function bindingParityProblems(drifted, declared, measured, versions) {
  const problems = []
  const notes = []
  const driftedSet = new Set(drifted)
  const measuredSet = new Set(measured)
  const { pinned, built } = versions

  if (declared.size > 0 && (!pinned || !built)) {
    problems.push(
      'binding-parity-drift.txt declares a pin window and this run could not read both versions ' +
        `(pin ${pinned ?? 'unreadable'}, built ${built ?? 'unreadable'}) - ` +
        'a declaration nothing can judge is worse than none.',
    )
    return { problems, notes }
  }

  if (declared.size > 0 && pinned === built) {
    problems.push(
      `binding-parity-drift.txt declares a pin window, and the pin and the built engine both say ${pinned}. ` +
        'The window is closed, so every row in it is a row about nothing - delete the file. ' +
        'A difference that survives the bump is a gap in the BINDING and is gated, not declared.',
    )
    return { problems, notes }
  }

  for (const [name, reason] of declared) {
    if (!reason.includes(`=${pinned}`)) {
      problems.push(
        `STALE PIN  ${name} is declared against another pin: the reason does not name "=${pinned}", ` +
          `which is what carve-rb pins now. Re-measure against the current pin.`,
      )
      continue
    }
    if (driftedSet.has(name)) continue
    if (!measuredSet.has(name)) {
      notes.push(`NOT REACHED  ${name} is declared and this run did not compare it - a sliced run cannot call a row stale.`)
      continue
    }
    problems.push(`AGREED     ${name} reproduces again - delete its row in the commit that moved the pin.`)
  }

  for (const name of driftedSet) {
    if (!declared.has(name)) {
      problems.push(`NEW        ${name} differs and is not declared - no pin explains it.`)
    }
  }

  return { problems, notes }
}
