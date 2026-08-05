/*
 * PART 12 §3a, enforced: a link or image that came from a REFERENCE keeps the
 * label the author wrote.
 *
 * §3a pins three fields on a reference: `href` (or `src`) carries the resolved
 * destination, and `ref`/`rawRef` record what was written - the derived label
 * and the bracket text. A consumer that wants to re-emit the document, or point
 * at the definition, has nothing else to work from once resolution has run.
 *
 * The schema cannot express this. It names both fields and marks both optional,
 * and it must: a direct `[text](/url)` link has no reference to record. So an
 * engine that resolves a reference and drops the label validates cleanly, and
 * three engines did exactly that - the only record of it was a prose table in
 * docs/ast-json.md, which was found wrong in both directions within two months
 * (carve#673, carve#674). Documentation of measured state is not enforcement.
 *
 * The rule needs the SOURCE. Nothing in a resolved tree distinguishes
 * `[text](/url)` from `[text][label]` once `href` holds the destination either
 * way; only the span the node came from says which the author wrote.
 */

import { walkNodes } from './ast-positions.mjs'

/** Nodes that can carry a reference. */
const REFERENCING = new Set(['link', 'image'])

/**
 * Was this slice written as a reference?
 *
 * Deliberately conservative: it answers yes only for the two shapes Carve has,
 * `[…][label]` and `[…][]`. Anything else - an inline destination, an
 * attributed span, a slice this function cannot account for - answers no. A false negative costs one unchecked node; a false positive would
 * demand fields §3a does not ask for, and a check nobody trusts gets deleted.
 */
function referenceForm(slice) {
  // A TRAILING ATTRIBUTE BLOCK is part of the span: `[intro][x]{.ext}` is a
  // reference with a class on it. Three of the corpus's own reference links are
  // written that way, and a classifier that reads only the last character calls
  // them neither form and passes them in silence - a check that cannot fail on
  // exactly the documents that exercise it.
  const withoutAttrs = slice.replace(/\{[^{}]*\}$/, '')
  const body = withoutAttrs.startsWith('!') ? withoutAttrs.slice(1) : withoutAttrs
  if (!body.startsWith('[') || !body.endsWith(']')) return null
  if (/\]\[[^[\]]*\]$/.test(body)) return body.endsWith('[]') ? 'collapsed' : 'full'
  // A BARE `[label]` IS NOT A REFERENCE. PART 9 §14 is explicit: the character
  // after the closing bracket selects the construct, and anything other than
  // `(`, `[` or `{` leaves the brackets as literal text - "Carve has no
  // shortcut reference link". Treating one as a reference here would demand
  // `ref`/`rawRef` for a construct the language does not have, and an engine
  // reading that finding would go looking for the wrong bug.
  return null
}

/**
 * The source a span covers, or null where the span cannot supply one.
 *
 * A missing or malformed `pos` is checkPositions' finding to make. Returning
 * null here keeps one defect to one report instead of two wordings of it.
 */
function sliceOf(codepoints, pos) {
  if (!pos || !Number.isInteger(pos.startOffset) || !Number.isInteger(pos.endOffset)) return null
  if (pos.startOffset < 0 || pos.endOffset > codepoints.length || pos.endOffset < pos.startOffset) return null
  return codepoints.slice(pos.startOffset, pos.endOffset).join('')
}

export function checkReferenceFields(doc, source, findings) {
  const codepoints = Array.from(source)
  for (const [node, path] of walkNodes(doc)) {
    if (!REFERENCING.has(node.type)) continue
    const hasRef = typeof node.ref === 'string'
    const hasRaw = typeof node.rawRef === 'string'

    // The pair rule, which needs no source: §3a describes `ref` and `rawRef`
    // together, so half of them is a producer bug whatever the node came from.
    if (hasRef !== hasRaw) {
      findings.push(
        `"${node.type}" at ${path} publishes ${hasRef ? '`ref` without `rawRef`' : '`rawRef` without `ref`'}: ` +
          'PART 12 section 3a describes the pair, and a consumer cannot re-emit the reference from half of it',
      )
      continue
    }
    if (hasRef) continue

    const slice = sliceOf(codepoints, node.pos)
    if (slice === null) continue
    const form = referenceForm(slice)
    if (!form) continue
    findings.push(
      `"${node.type}" at ${path} was written as a ${form} reference, ${JSON.stringify(slice)}, ` +
        'but publishes neither `ref` nor `rawRef`: PART 12 section 3a keeps the label the author wrote ' +
        'beside the resolved destination',
    )
  }
}
