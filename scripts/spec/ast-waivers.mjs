/*
 * The POSITION findings, declared: which are permitted and which are owed.
 *
 * `scripts/ast-conformance.mjs` has reported "missing pos on ..." since it was
 * written, and has never distinguished the two populations it prints together:
 *
 *   PERMITTED. PART 12 §4 exempts a node the producer REASSEMBLED - a table
 *   cell continued on a `+` line, a `text` run coalesced across a gap - because
 *   its value is not a slice of the source at any offset, so no honest span
 *   exists. docs/ast-json-contract.md names those cases verbatim - the clause is "A table
 *   cell continued on a `+` line, the hard break a line block makes" - and its
 *   conformance table's carve-js row names carve-js as the engine that omits a
 *   continued cell's position. Nothing to fix, in any engine, ever.
 *
 *   OWED. Everything else in that column. docs/ast-json-contract.md narrows the exemption
 *   to "covers nodes that *cannot* be placed, not nodes that have not been
 *   placed yet", and its conformance section states the test as "whether a true
 *   span EXISTS rather than whether one was written down". Each of these is an
 *   engine defect with an issue.
 *
 * Those clauses are cited by PHRASE and not by line, and the phrases are pinned
 * in scripts/spec/ast-page-anchors.mjs: the line numbers that used to stand here
 * had all drifted by the time carve#965 tabulated them, and the numbers that
 * issue proposed as the correction were stale before it was filed.
 *
 * Printed as one number, the two were indistinguishable, so the count moved
 * whenever the corpus grew and nobody could tell which half moved. Declaring
 * them separately is what makes the OWED half a number that means something,
 * and it is the same contract `resources/ast-value-divergence.txt` already
 * uses - exact in three directions rather than one:
 *
 *   - a finding that no line covers                -> UNWAIVED, fails
 *   - a declared line whose count moved            -> COUNT, fails
 *   - a declared line nothing produces any more    -> FIXED, fails until the
 *     line is deleted
 *
 * The third is the direction `reportValueDisagreements` could not fire in
 * (carve#534): it returned before reading its own declaration whenever nothing
 * diverged, which is exactly the state a stale line has to be deleted in.
 *
 * A waiver is per ENGINE, per DOCUMENT and per node TYPE, not per node type
 * alone. The grouped report strips the filename, so `14x missing pos on "text"`
 * reads as one cause and is six documents with three different causes - see
 * `groupFindings` below, which is the other half of the same defect.
 */

/**
 * The one finding class a waiver may cover.
 *
 * Deliberately narrow. Every other finding this checker produces - a §1a
 * adjacent run, a span outside its parent, a wrong slice - is either gated
 * already or has no permitted category at all, and a waiver file that could
 * absorb any of them would be an off switch rather than a declaration.
 */
const MISSING_POS = /^missing pos on "([A-Za-z_][A-Za-z0-9_]*)" at /

/** `03-links-12.crv: missing pos on "text" at $...` -> its two halves. */
export function splitFinding(finding) {
  const at = finding.indexOf('.crv: ')
  if (at === -1) return { document: null, text: finding }

  return { document: finding.slice(0, at + 4), text: finding.slice(at + 6) }
}

/** The node type a missing-position finding names, or null for anything else. */
export function waivableType(text) {
  const m = MISSING_POS.exec(text)

  return m ? m[1] : null
}

/*
 * THE OTHER HALF OF §4, and the half that could not fail.
 *
 * `waivableType` above recognizes an ABSENT position. Everything else this
 * checker produces used to fall into a counter called `unwaivable`, whose
 * comment said "never absorbable by a line" - true, and read as "cannot be
 * waived" when its effect was "is never gated". `partitionFindings` incremented
 * it and `continue`d, so no `problems` entry was ever produced and a grep of a
 * whole run for UNWAIVED returned nothing (carve#1637).
 *
 * What sat in it was thirty §4 EXTENT violations per engine: a span that IS
 * present and is WRONG. `checkStopsAtChildren` in ./ast-positions.mjs was
 * written precisely because a rule every engine breaks the same way is
 * invisible to the three-way panel - it reads the SOURCE, the only party that
 * cannot agree with an engine by accident - and its findings landed in the one
 * bucket that could not fail. Had all three engines still carried the defect
 * the panel would have been unanimous and the run GREEN.
 *
 * These are declared, not gated at zero, for the reason the sibling ledgers
 * give: in this fleet a fix lands in one engine and is ported over the
 * following days, and a gate that goes red until nine ports land across three
 * engines is a check that cannot PASS - the mirror of the one it replaces. The
 * declaration ratchets instead: exact in three directions, so the counts have
 * to come down as the engines conform and a new violation is red the day it
 * lands.
 *
 * DECLARED PER (engine, rule, node type) rather than per document. Per document
 * is the finer ledger and it is the wrong one here: an extent defect is one
 * construct behaving one way everywhere it appears - the same argument
 * `compareSpans` gives for keying by type - so a per-document list is sixty
 * lines describing two facts, and every engine fix would rewrite all sixty. Per
 * type still fails on a NEW violation of a type nothing declares, which a bare
 * per-engine total would not.
 *
 * THERE IS NO `permitted` STATUS HERE. A missing position has a permitted
 * category because §4 exempts a REASSEMBLED node - no honest span exists. A
 * span that exists and points at the wrong codepoint has no such reading, so
 * every line names the issue that will delete it. A ledger that could say
 * "permitted" would be the off switch this file's other half refuses to be.
 */
const EXTENT_RULES = [
  ['ends-past-last-child', /^span reaches past its last child on "([A-Za-z_][A-Za-z0-9_]*)" at /],
  [
    'ends-before-placed-child',
    /^span stops at its last PLACED child on "([A-Za-z_][A-Za-z0-9_]*)" at /,
  ],
  [
    'starts-past-opening-markup',
    /^pos does not begin at the markup that opens "([A-Za-z_][A-Za-z0-9_]*)" at /,
  ],
  [
    'empty-span-covers-more',
    /^span covers more than its own markup on an empty "([A-Za-z_][A-Za-z0-9_]*)" at /,
  ],
]

/** The rule ids a declaration line may name, in the order they are checked. */
export const EXTENT_RULE_IDS = EXTENT_RULES.map(([id]) => id)

/** The §4 extent rule a finding names and the node type it names, or null. */
export function extentFinding(text) {
  for (const [rule, pattern] of EXTENT_RULES) {
    const m = pattern.exec(text)
    if (m) return { rule, type: m[1] }
  }

  return null
}

/*
 * THE ONE CLASS THAT IS REPORTED AND DELIBERATELY NOT GATED.
 *
 * `checkShapeParity` diffs a satellite's tree against carve-js's. It is the
 * only finding in this list that is an ENGINE-AGAINST-ENGINE comparison rather
 * than a statement about the source, and `reportEngineDisagreement` in
 * scripts/ast-conformance.mjs states the policy for that whole family in its
 * own words: NOT A GATE, deliberately, because in this fleet a fix lands in one
 * engine first, so the engine that is RIGHT is routinely the odd one out for a
 * few days and failing on that would make the fix for a red run "wait".
 *
 * It is worse than that here. A reference checkout that is behind or locally
 * modified turns every satellite's line into a statement about the operator's
 * working copy - `referenceProvenance` exists because that measured 70 findings
 * once - so this is the one class whose count is not even about the engine it
 * names.
 *
 * COUNTED AND NAMED, not dropped. That distinction is the whole point of
 * carve#1637: the bucket it replaces was silent, and a run could print thirty
 * findings while reporting nothing about them. This one is reported on the
 * engine's own summary line and rolled up at the end of the run, and the panel
 * that DOES own it reconciles it against resources/ast-span-divergence.txt and
 * the shape comparison beside it.
 */
const REFERENCE_SHAPE = /^tree differs from the reference at /

/** True where a finding is the cross-engine shape diff, which has its own panel. */
export function isReferenceShapeFinding(text) {
  return REFERENCE_SHAPE.test(text)
}

const extentKeyOf = (engine, rule, type) => `${engine}\t${rule}\t${type}`

/** `<engine>  <rule>  <type>  <count>  <owner/repo#N>` - the extent ledger. */
export function parseExtentDeclarations(text) {
  const declared = new Map()
  const errors = []
  let lineNo = 0
  for (const raw of text.split('\n')) {
    lineNo += 1
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const parts = line.split(/\s+/)
    if (parts.length !== 5) {
      errors.push(`line ${lineNo}: expected 5 fields (engine rule type count issue), got ${parts.length}`)
      continue
    }
    const [engine, rule, type, countText, status] = parts
    if (!EXTENT_RULE_IDS.includes(rule)) {
      errors.push(`line ${lineNo}: unknown rule "${rule}"; known rules are ${EXTENT_RULE_IDS.join(', ')}`)
      continue
    }
    const count = Number(countText)
    if (!Number.isInteger(count) || count < 1) {
      errors.push(`line ${lineNo}: count must be a positive integer, got "${countText}"`)
      continue
    }
    // No `permitted` here, deliberately - see the note above. A §4 extent
    // violation is always owed, so the status field is an issue or an error.
    if (!/^[\w.-]+\/[\w.-]+#\d+$/.test(status)) {
      errors.push(
        `line ${lineNo}: status must be a fully qualified owner/repo#N - a §4 extent ` +
          `violation is never "permitted", got "${status}"`,
      )
      continue
    }
    const key = extentKeyOf(engine, rule, type)
    if (declared.has(key)) {
      errors.push(`line ${lineNo}: ${engine} ${rule} ${type} is declared twice`)
      continue
    }
    declared.set(key, { engine, rule, type, count, status, lineNo })
  }

  return { declared, errors }
}

const keyOf = (engine, document, type) => `${engine}\t${document}\t${type}`

/**
 * The engines whose position findings are RECONCILED against the declaration.
 *
 * The same three the shape panel calls independent, and excluded for the same
 * reason it excludes carve-rb: that binding serializes carve-rs's tree, so its
 * findings ARE carve-rs's findings arriving a second time. Declaring them
 * separately would record one engine's debt twice and make closing a carve-rs
 * issue fail the run until a second set of lines was deleted too - a
 * declaration that lies about how many engines owe something.
 *
 * A derived engine's findings are still reported and still counted. They are
 * just not reconciled, and the run says so rather than silently passing them.
 */
export const RECONCILED_ENGINES = new Set(['carve-js', 'carve-rs', 'carve-php'])

/** Why an engine is not reconciled, or null when it is. */
export function notReconciledBecause(engine) {
  if (RECONCILED_ENGINES.has(engine)) return null

  return `${engine} publishes another engine's tree, so its position findings are already declared under that engine`
}

/**
 * The declaration file.
 *
 * `<engine>  <document>  <type>  <count>  <status>`, whitespace-separated,
 * `#` comments and blank lines ignored. `status` is either `permitted` or an
 * `owner/repo#N` issue reference - a status this cannot read is an error rather
 * than a default, because "permitted" is the answer that silences a check and
 * must never be reachable by typo.
 */
export function parseWaivers(text) {
  const declared = new Map()
  const errors = []
  let lineNo = 0
  for (const raw of text.split('\n')) {
    lineNo += 1
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const parts = line.split(/\s+/)
    if (parts.length !== 5) {
      errors.push(`line ${lineNo}: expected 5 fields (engine document type count status), got ${parts.length}`)
      continue
    }
    const [engine, document, type, countText, status] = parts
    const count = Number(countText)
    if (!Number.isInteger(count) || count < 1) {
      errors.push(`line ${lineNo}: count must be a positive integer, got "${countText}"`)
      continue
    }
    if (status !== 'permitted' && !/^[\w.-]+\/[\w.-]+#\d+$/.test(status)) {
      errors.push(
        `line ${lineNo}: status must be "permitted" or a fully qualified owner/repo#N, got "${status}"`,
      )
      continue
    }
    const key = keyOf(engine, document, type)
    if (declared.has(key)) {
      errors.push(`line ${lineNo}: ${engine} ${document} ${type} is declared twice`)
      continue
    }
    declared.set(key, { engine, document, type, count, status, lineNo })
  }

  return { declared, errors }
}

/**
 * One engine's findings against BOTH declarations.
 *
 * Every finding now leaves through one of three doors, and each of them can
 * fail the run. The old third door could not: `unwaivable` counted a finding
 * and dropped it, which is how thirty §4 extent violations per engine were
 * printed in full by a run that exited green (carve#1637).
 *
 *   MISSING POSITION -> `resources/ast-position-waivers.txt`, which has a
 *   `permitted` category because §4 exempts a reassembled node.
 *   §4 EXTENT       -> `resources/ast-extent-findings.txt`, issue-only, no
 *   permitted category at all.
 *   REFERENCE SHAPE -> `reference`, counted and named on the summary line and
 *   rolled up at the end of the run, and gated by NEITHER ledger. It is the one
 *   ENGINE-AGAINST-ENGINE finding in this list and the run's own policy for that
 *   family is not to gate it - see the note above `REFERENCE_SHAPE`.
 *   ANYTHING ELSE   -> `ungated`, which fails on sight. There is no ledger for
 *   a wrong slice, a span outside its parent or a §1a run, and there should not
 *   be: those are defects to fix, not numbers to record.
 *
 * Returns the totals the report prints and three separate problem lists, so
 * each ledger's drift is reported against the file that owns it rather than
 * under whichever heading happened to be printing.
 */
export function partitionFindings(engine, findings, declared, extentDeclared = new Map()) {
  const measured = new Map()
  const extentMeasured = new Map()
  const ungated = []
  let reference = 0
  for (const finding of findings) {
    const { document, text } = splitFinding(finding)
    const type = document === null ? null : waivableType(text)
    if (type !== null) {
      const key = keyOf(engine, document, type)
      measured.set(key, (measured.get(key) ?? 0) + 1)
      continue
    }
    const found = extentFinding(text)
    if (found !== null) {
      const key = extentKeyOf(engine, found.rule, found.type)
      extentMeasured.set(key, (extentMeasured.get(key) ?? 0) + 1)
      continue
    }
    if (isReferenceShapeFinding(text)) {
      reference += 1
      continue
    }
    ungated.push(finding)
  }

  let waived = 0
  let outstanding = 0
  let undeclared = 0
  const problems = []
  for (const [key, count] of measured) {
    const [, document, type] = key.split('\t')
    const line = declared.get(key)
    if (!line) {
      // COUNTED, not just reported. The four buckets must add up to the total
      // findings, and a bucket that silently drops the undeclared ones would
      // make the arithmetic check below pass while the report's own numbers
      // said less than the run measured.
      undeclared += count
      problems.push(
        `UNWAIVED   ${engine}  ${document}  ${type}  ${count}  ` +
          '- no line covers it; declare it permitted (§4) or file the engine issue and name it here',
      )
      continue
    }
    if (line.count !== count) {
      problems.push(
        `COUNT      ${engine}  ${document}  ${type}  declares ${line.count}, measured ${count}`,
      )
    }
    if (line.status === 'permitted') waived += count
    else outstanding += count
  }
  for (const [key, line] of declared) {
    if (line.engine !== engine) continue
    if (!measured.has(key)) {
      problems.push(
        `FIXED      ${engine}  ${line.document}  ${line.type}  is declared (${line.status}) but ` +
          'no longer occurs - delete the line',
      )
    }
  }

  // THE EXTENT LEDGER, the same three directions. UNDECLARED prints the line to
  // paste, because the alternative is a reader deriving five whitespace-separated
  // fields from a sentence, and a ledger that is tedious to update is a ledger
  // that gets widened instead.
  let extent = 0
  const extentProblems = []
  for (const [key, count] of extentMeasured) {
    extent += count
    const [, rule, type] = key.split('\t')
    const line = extentDeclared.get(key)
    if (!line) {
      extentProblems.push(
        `UNDECLARED ${engine}  ${rule}  ${type}  ${count}  - a PART 12 §4 extent violation no ` +
          'line covers. Fix the engine, or record it as:  ' +
          `${engine}  ${rule}  ${type}  ${count}  <owner/repo#N>`,
      )
      continue
    }
    if (line.count !== count) {
      extentProblems.push(
        `COUNT      ${engine}  ${rule}  ${type}  declares ${line.count}, measured ${count}` +
          ` (${line.status})`,
      )
    }
  }
  for (const [key, line] of extentDeclared) {
    if (line.engine !== engine) continue
    if (!extentMeasured.has(key)) {
      extentProblems.push(
        `FIXED      ${engine}  ${line.rule}  ${line.type}  is declared (${line.status}) but ` +
          'no longer occurs - delete the line',
      )
    }
  }

  return {
    waived,
    outstanding,
    undeclared,
    extent,
    reference,
    ungated: ungated.length,
    problems,
    extentProblems,
    ungatedProblems: ungated.map(
      (finding) =>
        `UNGATED    ${engine}  ${finding}  - no ledger covers this finding class, and none ` +
        'should: fix it rather than declaring it',
    ),
  }
}

/**
 * The grouped report, keeping the DOCUMENTS.
 *
 * `report()` used to strip the filename into the group key and keep exactly one
 * example, the first document that produced the group. So carve-php's entire
 * report was one line, `14x missing pos on "text" [03-links-12.crv]`, printed
 * under "1 distinct" - and it was at least two causes: a merged run in
 * `03-links-12` that §4 permits and nobody should touch, and four placeable
 * text nodes at `182-openers-past-the-nesting-cap-are-one-paragraph` that are a
 * real engine gap. The line named the one nobody should act on and hid the one
 * somebody should (carve#534).
 *
 * One example is enough to reproduce a finding and not enough to see whether it
 * is one cause or several, which is the question a grouped report exists to
 * answer.
 */
export function groupFindings(findings) {
  const groups = new Map()
  for (const finding of findings) {
    const { document, text } = splitFinding(finding)
    const key = text.replace(/at \$[^\s]*/, 'at <path>')
    let entry = groups.get(key)
    if (!entry) {
      entry = { key, n: 0, documents: new Set() }
      groups.set(key, entry)
    }
    entry.n += 1
    if (document !== null) entry.documents.add(document)
  }

  return [...groups.values()].sort((a, b) => b.n - a.n || a.key.localeCompare(b.key))
}

/** `6 document(s): a.crv, b.crv, c.crv (+3 more)`, or nothing when there are none. */
export function describeDocuments(documents) {
  const names = [...documents].sort()
  if (names.length === 0) return ''
  const shown = names.slice(0, 3).join(', ')
  const rest = names.length > 3 ? ` (+${names.length - 3} more)` : ''

  return `${names.length} document(s): ${shown}${rest}`
}
