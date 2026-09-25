/*
 * The pinned shape of an `attribute-preserved` message, and the per-case ledger
 * of subjects the roundtrip import report owes a row for (carve#2279).
 *
 * A subject producing NO row in an engine pairs against nothing, so the
 * row-for-row comparison in scripts/import-report-claims.mjs saw a shorter list
 * and agreed with itself. The ledger names the subjects a case must carry, which
 * is what lets a MISSING row be refused rather than agreed with.
 */

/**
 * `Preserved <subject> on <tag> <place><reason>` - the skeleton all three
 * engines share. `place` says whether the element is itself the one kept whole.
 */
export const PRESERVED_MESSAGE =
  /^Preserved (?<subject>.+?) on <(?<tag>[a-z][a-z0-9]*)> (?:in the raw HTML this element is kept as|inside the raw HTML <[a-z][a-z0-9]*> is kept as)(?<reason>|: .+)$/

/**
 * The subject: the attribute's own name, a kind before the word `attribute`
 * where the row names one, and what makes it refused where the row names that.
 */
export const PRESERVED_SUBJECT =
  /^(?:(?<kind>[A-Za-z][A-Za-z0-9 -]*?) attribute )?(?<name>[^ ]+)(?: with .+)?$/

/**
 * A preserved row read as tag, attribute name and whether its subject fits the
 * template.
 *
 * The name is recovered from the LAST token even where the subject does not fit,
 * so a row this ledger declares pending can still be keyed and excused rather
 * than reported twice.
 */
export function parsePreservedMessage(message) {
  const outer = PRESERVED_MESSAGE.exec(message)
  if (!outer) return null
  const { subject, tag, reason } = outer.groups
  const inner = PRESERVED_SUBJECT.exec(subject)
  const name = inner ? inner.groups.name : subject.split(' ').at(-1)

  return { tag, name, subject, reason, kind: inner?.groups.kind, wellFormed: Boolean(inner) }
}

const engineList = (names) => [...names].sort().join(', ')

/**
 * Audit one case's preserved rows against its ledger.
 *
 * `byEngine` maps an engine name to its diagnostic list. Returns the failures,
 * the PENDING lines to print, and the keys whose rows the caller holds out of
 * the row-for-row comparison because a declaration excuses them.
 */
export function auditPreservedSubjects(caseName, ledger, byEngine) {
  const failures = []
  const notes = []
  const declared = new Map(ledger.map((entry) => [entry.key, entry]))
  const engines = [...byEngine.keys()]
  const seen = new Map()

  for (const [engine, diagnostics] of byEngine) {
    for (const diagnostic of diagnostics) {
      if (diagnostic.code !== 'attribute-preserved') continue
      const parsed = parsePreservedMessage(diagnostic.message)
      if (!parsed) {
        failures.push(
          `${caseName}: ${engine} writes a preserved row that is not `
            + `\`Preserved <subject> on <tag> <place>\`: ${diagnostic.message}`,
        )
        continue
      }
      const key = `${parsed.tag}.${parsed.name}`
      if (!seen.has(key)) seen.set(key, new Map())
      seen.get(key).set(engine, parsed)
    }
  }

  for (const [key, byName] of seen) {
    if (!declared.has(key)) {
      failures.push(
        `${caseName}: ${engineList(byName.keys())} report a row for ${key}, which the case's subject `
          + 'ledger does not name. Add it, or correct the engine.',
      )
    }
  }

  for (const [key, entry] of declared) {
    const byName = seen.get(key) ?? new Map()
    const missing = engines.filter((engine) => !byName.has(engine))

    if (byName.size === 0) {
      failures.push(
        `${caseName}: no engine reports a row for ${key}, so this case no longer carries that subject.`,
      )
      continue
    }
    if (!entry.pending) {
      if (missing.length > 0) {
        failures.push(
          `${caseName}: ${engineList(missing)} report no row for ${key}; ${engineList(byName.keys())} do. `
            + 'A subject owed a row is owed one in every engine.',
        )
      }
      for (const [engine, parsed] of byName) {
        if (parsed.wellFormed) continue
        failures.push(
          `${caseName}: ${engine} spells ${key}'s subject "${parsed.subject}", which is not `
            + 'the pinned template: a kind is followed by the word `attribute`, and a subject naming no kind is the attribute name alone.',
        )
      }
      continue
    }
    if (missing.length === 0 && [...byName.values()].every((parsed) => parsed.wellFormed)) {
      failures.push(
        `${caseName}: every engine now reports ${key} in the pinned shape, so the pending entry `
          + `(${entry.pending}) no longer describes them. Drop \`pending\` so the rows are gated like every other one.`,
      )
      continue
    }
    const says = [...byName].map(([engine, parsed]) => `${engine} "${parsed.subject}"`).join('; ')
    const silent = missing.length > 0 ? `; ${engineList(missing)} report nothing` : ''
    notes.push(`PENDING ${caseName}: ${key} - ${says}${silent} (${entry.pending})`)
  }

  return { failures, notes, excused: new Set([...declared].filter(([, e]) => e.pending).map(([key]) => key)) }
}
