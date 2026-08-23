/*
 * The oracle joins the comparison (markup-carve/carve#1552).
 *
 * WHY. markup-carve/carve#1517 was a parse defect in all three engines: a later
 * list marker in an item body folded into an open paragraph instead of opening
 * a sublist. `scripts/spec/layout.mjs` had it right from the clause the whole
 * time - it breaks on `inItem && para.length > 0 && matchMarkerAt(ind(i))`,
 * cited to PART 9 section 24 C3 - and nothing in this repository went red for
 * months. The three-way panel compares the engines to EACH OTHER, so all three
 * wrong the same way is structurally invisible, and the oracle, the one reader
 * derived straight from the normative text, was the one participant nobody
 * asked.
 *
 * WHERE IT CAN ANSWER, MEASURED BEFORE ANYTHING WAS BUILT. The scoping is the
 * deliverable, not a hedge: a comparison that reports a hundred known
 * non-participations gets muted, and then it is gone.
 *
 *   TARGET. `scripts/spec` ships ONE writer, `html.mjs`. There is no Markdown,
 *   plain-text, ANSI or canonical-Carve renderer in it, so the oracle
 *   participates on the html target and on no other. The other four stay
 *   engine-against-engine in `scripts/compare-impls.mjs`.
 *
 *   POPULATION. Three candidate sets were measured:
 *
 *     - the CORE CORPUS, 1362 documents: the oracle answers for every one of
 *       them and reproduces all 1362 committed fixtures byte for byte. So its
 *       participation there cannot fail while `tests/corpus.test.mjs` is green -
 *       oracle == fixture and engine == fixture are both already gated, and a
 *       check that cannot fail is the markup-carve/carve#755 family, not
 *       coverage. Excluded, and that exclusion is the measurement.
 *     - the OPTIONAL corpus, 41 html-target cases: the oracle matches 2. It
 *       does not model Tier-2 rendering at all. Excluded - 39 declared
 *       non-participations is precisely the report that gets muted.
 *     - the AUTHORED documents, 85 of them: the ```carve samples in the docs
 *       pages plus the Playground `.crv` files. No expected-output file pins
 *       any of them, `tests/doc-carve-samples.test.mjs` only asks whether they
 *       parse and build their blocks, and the oracle had never read one. That
 *       is the population.
 *
 * WHAT IT FOUND ON ITS FIRST RUN. Two documents, both pointing at the ORACLE
 * rather than at the engines - a caption continuation line and the numbering of
 * an inline note against an earlier labeled reference, each decided against
 * the clause it violates and each declared in `resources/oracle-divergence.txt`
 * with its issue. The direction is the point: a comparison whose disagreements
 * only ever indict the other participant is a comparison nobody would trust.
 *
 * WHAT THIS DOES NOT CLOSE. It would NOT have caught markup-carve/carve#1517,
 * and that was measured too rather than hoped: carve-js at 49fa045b^ (the
 * commit before its fix) diverges from the oracle on exactly one corpus
 * document, `401-a-marker-at-an-item-content-column-...`, which
 * markup-carve/carve#1548 added afterwards - and on none of the 1359 documents
 * that predate it, none of their formatted forms, none of the 24 round-trip
 * documents, none of the 63 `.fmt` fixtures, and none of the 85 documents here.
 * The shape was absent from every document the repository held, so no
 * participant could have disagreed about it. The half that closes it is a
 * GENERATOR that reaches the shape, which is the `repeated-child` family added
 * to `scripts/combinatorial-check.mjs` in the same change - the oracle is
 * already a participant there, and two of that family's 42 documents move under
 * the markup-carve/carve#1517 fix.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'
import {
  AUTHORED_ANSWERED,
  AUTHORED_POPULATION,
  authoredDocuments,
} from '../scripts/lib/authored-documents.mjs'
import { parseDriftLedger } from '../scripts/lib/drift-ledger.mjs'
import { miscount, shortfall } from '../scripts/spec/participants.mjs'
import { Refuse, parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const ledgerPath = resolve(root, 'resources/oracle-divergence.txt')

const documents = authoredDocuments()

/**
 * The oracle's answer, or why it has none.
 *
 * A REFUSAL is a legitimate answer from the executable spec - its subset is
 * narrower than the language - and is a non-participation, not a divergence. An
 * ERROR is neither: it is a defect in the oracle and is reported as one.
 */
function oracleHtml(source) {
  try {
    return { answered: true, html: renderDoc(parse(source)).trim() }
  } catch (error) {
    if (error instanceof Refuse || error.refuse) {
      return { answered: false, reason: `refused: ${error.message}` }
    }
    return { answered: false, failed: true, reason: `threw: ${error.message}` }
  }
}

const readings = documents.map((doc) => ({ ...doc, oracle: oracleHtml(doc.source) }))
const answered = readings.filter((r) => r.oracle.answered)

test('the authored population is exactly what was measured', () => {
  /*
   * A FLOOR FIRST, because both assertions after it are about a list, and a
   * list that came out empty satisfies almost anything said about one. The
   * scanner walks `git ls-files docs`, so a checkout without git history - or a
   * `docs/` that moved - yields nothing and every count below reads as
   * agreement (markup-carve/carve#755, variant 2).
   */
  const thin = shortfall({
    label: 'AUTHORED',
    actual: documents.length,
    atLeast: 20,
    of: 'authored document(s)',
    hint: 'scripts/lib/authored-documents.mjs walks `git ls-files docs`; a run with no git history sees none.',
  })
  assert.equal(thin, null, thin ?? '')

  /*
   * Then the exact count, in BOTH directions. Shrinking coverage must go red
   * and so must growing it: a one-directional pin is half a check, and this
   * repository has shipped that half more than once - most recently inside a
   * check written to close another one (markup-carve/carve#1541).
   */
  const drifted = miscount({
    label: 'AUTHORED',
    actual: documents.length,
    expected: AUTHORED_POPULATION,
    of: 'authored document(s)',
  })
  assert.equal(
    drifted,
    null,
    `${drifted}\nThe docs gained or lost a \`\`\`carve sample. Re-measure and move ` +
      `AUTHORED_POPULATION in scripts/lib/authored-documents.mjs in this same commit; ` +
      `the number exists so the change is stated rather than absorbed.`,
  )
})

test('the oracle answers for exactly the documents it was measured to answer for', () => {
  const drifted = miscount({
    label: 'ORACLE',
    actual: answered.length,
    expected: AUTHORED_ANSWERED,
    of: 'answered document(s)',
  })
  const nonParticipations = readings
    .filter((r) => !r.oracle.answered)
    .map((r) => `  ${r.id}: ${r.oracle.reason}`)
    .join('\n')
  assert.equal(
    drifted,
    null,
    `${drifted}\nNon-participations in this run:\n${nonParticipations || '  (none)'}\n` +
      `Move AUTHORED_ANSWERED in scripts/lib/authored-documents.mjs in the commit ` +
      `that changes the subset, and say which construct moved.`,
  )
})

test('the oracle never THROWS on an authored document', () => {
  /*
   * Separate from the count above on purpose. A refusal and a crash are both
   * "no answer" and would net out to the same number, so counting alone lets
   * the oracle start crashing on a document it used to decline politely.
   */
  const crashed = readings.filter((r) => r.oracle.failed).map((r) => `${r.id} - ${r.oracle.reason}`)
  assert.deepEqual(crashed, [], `the executable spec threw:\n  ${crashed.join('\n  ')}`)
})

test('the oracle and the pinned engine agree, or the divergence is declared', () => {
  const declared = parseDriftLedger(ledgerPath)

  const diverging = new Map()
  /*
   * A THROW IS NOT AN OUTPUT, and it is tracked apart from the comparison.
   *
   * Folding a crash into the compared string makes it a divergence, and a
   * divergence on a DECLARED document is accepted - so an engine that starts
   * crashing on one of the two samples already listed in the ledger would pass
   * every assertion here. `scripts/fuzz-impls.mjs` records the same trap from
   * the other side: three engines crashing identically read as agreement.
   */
  const crashed = []
  for (const reading of answered) {
    let engine
    try {
      engine = carveToHtml(reading.source).trim()
    } catch (error) {
      crashed.push(`${reading.id} - ${error.message}`)
      continue
    }
    if (engine !== reading.oracle.html) diverging.set(reading.id, { engine, oracle: reading.oracle.html })
  }

  assert.deepEqual(
    crashed,
    [],
    `the pinned build threw on an authored document:\n  ${crashed.join('\n  ')}`,
  )

  const undeclared = [...diverging.keys()].filter((id) => !declared.has(id))
  assert.deepEqual(
    undeclared,
    [],
    undeclared
      .map((id) => {
        const { oracle, engine } = diverging.get(id)
        return (
          `${id} - the executable spec and the pinned build read this document differently.\n` +
          `  oracle: ${JSON.stringify(oracle).slice(0, 400)}\n` +
          `  engine: ${JSON.stringify(engine).slice(0, 400)}\n` +
          `  Decide it against the clause, then either fix the side that is wrong or ` +
          `declare it in resources/oracle-divergence.txt with the clause and an issue.`
        )
      })
      .join('\n\n'),
  )

  /*
   * The other direction. A declaration that no longer reproduces is debt that
   * has been paid and not written off, and left in place it makes the next
   * reader believe a defect is still open. It comes out in the commit that
   * fixed it.
   */
  const stale = [...declared.keys()].filter((id) => !diverging.has(id))
  assert.deepEqual(
    stale,
    [],
    stale
      .map((id) => `${id} now agrees - delete its line from resources/oracle-divergence.txt`)
      .join('\n'),
  )

  /*
   * And a declaration for a document that is not in the population at all,
   * which is how a ledger survives a docs rename: the sample moved, the line
   * kept passing as "not diverging", and the finding was silently retired.
   */
  const present = new Set(documents.map((doc) => doc.id))
  const orphaned = [...declared.keys()].filter((id) => !present.has(id))
  assert.deepEqual(
    orphaned,
    [],
    `resources/oracle-divergence.txt names document(s) the population does not hold: ${orphaned.join(', ')}`,
  )
})
