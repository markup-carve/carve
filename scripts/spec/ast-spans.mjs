/*
 * SPAN signatures for the three-way engine comparison.
 *
 * The panel this repo runs answers two questions and neither is "do the engines
 * put a node in the same place":
 *
 *   `shapeOf` (./ast-shape.mjs) drops every scalar, so it answers "do the
 *   engines build the same tree".
 *   `valueSignature` (./ast-values.mjs) keeps the scalars and drops the
 *   POSITION keys explicitly, on the stated grounds that they are "compared
 *   elsewhere".
 *
 * ELSEWHERE is `checkPositions` (./ast-positions.mjs), which compares an engine
 * against the SOURCE and never against another engine. Its rules are real -
 * containment, sibling overlap, a span that starts on a line terminator - but
 * the only CONTENT-level rule it has, `slice !== node.value`, can run on a
 * `text` node alone, because a text node is the only node whose exact source
 * text the tree carries.
 *
 * So `ast:check` reported 83 findings, every one of them "missing pos", and
 * ZERO disagreements about where a present `pos` points - because it never
 * compared them. Two examples of what that hid, both found the day this module
 * was written and both still true of the engines' mains:
 *
 *   `117-footnote-definition-inside-a-container-is-collected`: carve-rs gives
 *   the `block_quote` a span covering `"> "`, the marker alone. carve-js and
 *   carve-php give the whole quote. Invisible to containment because the
 *   footnote hoists to the root, leaving the quote with no children to contain.
 *
 *   `132-thematic-break-requires-contiguous-markers`, source `* * *`: carve-php
 *   publishes `text [0,1]` where the other two publish `[4,5]`. BOTH slices are
 *   `"*"`, so the one content-level rule passes for both.
 *
 * That second one is the shape this repo keeps re-finding (carve#755): the rule
 * asserts a property the bug PRESERVES. A span pointing at the wrong occurrence
 * of the same character slices to the right text. So this module does not
 * assert anything about what a span slices to. It compares the spans.
 *
 * WHAT IT DOES NOT DECIDE. Whether a node's span covers the markup that OPENS
 * it - the list marker, the `>`, the `[^a]: ` - was markup-carve/carve#913, and
 * it is RULED: docs/ast-json.md states that a span "begins at the markup that
 * opens the construct". Most of what this panel reports is that question,
 * so those rows are engines owing a fix rather than an open convention.
 *
 * NOT ALL OF THEM. `checkOpeningMarkup` permits a start anywhere in the line's
 * leading indentation, so two engines can start a span at different offsets in
 * that run and both pass the source-side rule. Such a row is owed by nobody and
 * cannot be retired by fixing an engine (markup-carve/carve#1928).
 *
 * What this module still does not do is say WHICH engine owes it, because that
 * needs the source and this module only has the trees. It reports a
 * DISAGREEMENT; the rules that name a side live in ./ast-positions.mjs and each
 * engine runs them against its own tree - `checkOpeningMarkup` for where a span
 * BEGINS, `checkStopsAtChildren` for where it ENDS. Which one applies depends
 * on which end of the row moved, and reading an end-only row under the start
 * rule blames the narrow engine when the wide one owes it (carve#1637). A
 * declared count that moves means an engine changed its mind about a span, and
 * nothing else in this repo can see that happen.
 */

import { POS_KEYS } from './ast-shape.mjs'

/**
 * One entry per node, in document order: `type` plus its `pos`, or null.
 *
 * The walk mirrors `valueSignature`'s exactly - typed node first, then its
 * object-valued keys IN SORTED KEY ORDER - because the two signatures are
 * paired by index against each other's engines and a different order would pair
 * a caption's text with a body cell's (carve#791, the same trap one module
 * over).
 */
export function spanSignature(node, out = [], path = '$') {
  if (Array.isArray(node)) {
    node.forEach((n, i) => spanSignature(n, out, `${path}[${i}]`))

    return out
  }
  if (!node || typeof node !== 'object') return out

  if (typeof node.type === 'string') {
    out.push({ path, type: node.type, span: spanOf(node) })
  }

  for (const key of Object.keys(node).sort()) {
    if (key === 'pos') continue
    const value = node[key]
    if (value && typeof value === 'object') spanSignature(value, out, `${path}.${key}`)
  }

  return out
}

/**
 * A node's span as one comparable string, or null when it has none.
 *
 * ALL SIX KEYS, not just the offsets. Lines and columns are derivable from the
 * offsets and the source, which is exactly why an engine deriving them wrongly
 * would go unnoticed by a comparison that only read offsets.
 */
export function spanOf(node) {
  const pos = node.pos
  if (!pos || typeof pos !== 'object') return null

  return POS_KEYS.map((k) => `${k}=${pos[k]}`).join(' ')
}

/**
 * Where the engines disagree about a span, keyed by `type (presence|extent)`.
 *
 * PRESENCE and EXTENT are separated because they are different facts with
 * different owners. Presence is PART 12 §4 and has a permitted category
 * (`resources/ast-position-waivers.txt` declares which); extent is §4's
 * markup-inclusive rule and has none. Folding them into one row would let a
 * permitted omission and a wrong span share a number.
 *
 * Keyed by TYPE rather than by document for the reason `compareValues` gives:
 * each of these is one construct behaving one way everywhere it appears, and a
 * per-document list is hundreds of entries describing a dozen facts.
 *
 * Returns `[{ key, kind, type, engines, sample }]`.
 */
export function compareSpans(signaturesByEngine, documentName) {
  const engines = [...signaturesByEngine.keys()]
  const lengths = new Set(engines.map((e) => signaturesByEngine.get(e).length))
  // A different node count is a SHAPE disagreement, which ast-shape.mjs
  // reports. Pairing spans across trees of different lengths would compare
  // unrelated nodes and invent divergences that are not there.
  if (lengths.size !== 1) return []

  const count = signaturesByEngine.get(engines[0]).length
  const found = []
  for (let i = 0; i < count; i += 1) {
    const nodes = new Map(engines.map((e) => [e, signaturesByEngine.get(e)[i]]))
    const types = new Set([...nodes.values()].map((n) => n.type))
    if (types.size !== 1) continue // shape disagreement again
    const type = [...types][0]

    const presence = new Map([...nodes].map(([e, n]) => [e, n.span === null ? 'absent' : 'placed']))
    if (new Set(presence.values()).size !== 1) {
      found.push({
        key: `${type} (presence)`,
        kind: 'presence',
        type,
        engines: Object.fromEntries(presence),
        sample: documentName,
      })
      // A node one engine did not place has nothing to compare an extent
      // against. Reporting both would count the same fact twice.
      continue
    }
    if ([...presence.values()][0] === 'absent') continue

    const spans = new Map([...nodes].map(([e, n]) => [e, n.span]))
    if (new Set(spans.values()).size !== 1) {
      found.push({
        key: `${type} (extent)`,
        kind: 'extent',
        type,
        engines: Object.fromEntries(spans),
        sample: documentName,
      })
    }
  }

  return found
}

/**
 * How many nodes an engine PLACED, over one signature.
 *
 * THE OPT-IN TRAP, closed. Positions are an opt-in parse option in carve-rs and
 * carve-php: a probe that does not request them receives a tree with no `pos`
 * anywhere, and this panel would then compare absent against absent on every
 * node of every document and print that the engines agree. That is the exact
 * shape of a check that cannot fail, and it would be indistinguishable from
 * three engines in perfect agreement.
 *
 * So the caller asserts each engine placed SOMETHING before believing any
 * comparison, and this is what it counts with.
 */
export function countPlaced(signature) {
  return signature.reduce((n, entry) => n + (entry.span === null ? 0 : 1), 0)
}

/**
 * The declaration file, and the three ways it can be wrong.
 *
 * Same contract and same three directions as `resources/ast-value-divergence.txt`,
 * and reconciled UNCONDITIONALLY by its caller - the value panel's version was
 * unreachable whenever nothing diverged, which is precisely the state a stale
 * line has to be deleted in (carve#534).
 *
 * `measured` maps `key` to the documents exhibiting it.
 */
export function reconcileSpans(measured, declaredText) {
  const declared = new Map()
  const problems = []
  let lineNo = 0
  for (const raw of declaredText.split('\n')) {
    lineNo += 1
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const m = /^(\S+)\s+\((presence|extent)\)\s+(\d+)$/.exec(line)
    if (!m) {
      problems.push(`MALFORMED  line ${lineNo}: expected "<type> (presence|extent)  <count>", got "${line}"`)
      continue
    }
    declared.set(`${m[1]} (${m[2]})`, Number(m[3]))
  }

  for (const [key, documents] of measured) {
    const n = documents instanceof Set ? documents.size : new Set(documents).size
    if (!declared.has(key)) {
      problems.push(`NEW        ${key} disagrees in ${n} document(s) and is not declared`)
    } else if (declared.get(key) !== n) {
      problems.push(`COUNT      ${key} declares ${declared.get(key)} document(s), measured ${n}`)
    }
  }
  for (const key of declared.keys()) {
    if (!measured.has(key)) {
      problems.push(`AGREED     ${key} no longer disagrees - delete its line`)
    }
  }

  return problems
}
