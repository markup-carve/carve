/*
 * The POSITION findings, declared: which are permitted and which are owed.
 *
 * `scripts/ast-conformance.mjs` has reported "missing pos on ..." since it was
 * written, and has never distinguished the two populations it prints together:
 *
 *   PERMITTED. PART 12 §4 exempts a node the producer REASSEMBLED - a table
 *   cell continued on a `+` line, a `text` run coalesced across a gap - because
 *   its value is not a slice of the source at any offset, so no honest span
 *   exists. docs/ast-json.md names those cases verbatim - the clause is "A table
 *   cell continued on a `+` line, the hard break a line block makes" - and its
 *   conformance table's carve-js row names carve-js as the engine that omits a
 *   continued cell's position. Nothing to fix, in any engine, ever.
 *
 *   OWED. Everything else in that column. docs/ast-json.md narrows the exemption
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
 * One engine's findings against the declaration.
 *
 * Returns the two totals the report prints and the problems that fail the run.
 * `unwaivable` is every finding that is not a missing position: counted so the
 * three numbers still add up to the total, and never absorbable by a line.
 */
export function partitionFindings(engine, findings, declared) {
  const measured = new Map()
  let unwaivable = 0
  for (const finding of findings) {
    const { document, text } = splitFinding(finding)
    const type = document === null ? null : waivableType(text)
    if (type === null) {
      unwaivable += 1
      continue
    }
    const key = keyOf(engine, document, type)
    measured.set(key, (measured.get(key) ?? 0) + 1)
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

  return { waived, outstanding, undeclared, unwaivable, problems }
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
