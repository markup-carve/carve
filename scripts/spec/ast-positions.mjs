/*
 * A document's POSITIONS, checked against the source they claim to cover.
 *
 * Extracted from scripts/ast-conformance.mjs so it can be tested without
 * running the whole conformance report, which needs sibling engine checkouts
 * and exits the process. The report is the only caller; these rules are the
 * part of it that a test can reach.
 */

import { POS_KEYS } from './ast-shape.mjs'

/**
 * Every typed node in a tree, with the path that reaches it.
 *
 * `pos` is not descended into: it holds integers, not nodes.
 */
export function* walkNodes(node, path = '$') {
  if (Array.isArray(node)) {
    for (const [i, child] of node.entries()) yield* walkNodes(child, `${path}[${i}]`)
    return
  }
  if (!node || typeof node !== 'object') return
  if (typeof node.type === 'string') yield [node, path]
  for (const [key, value] of Object.entries(node)) {
    if (key === 'pos') continue
    yield* walkNodes(value, `${path}.${key}`)
  }
}

/**
 * A BREAK is the one node whose span may begin with a line terminator, because
 * the terminator is what it is. Everything else that starts there is wrong -
 * see `checkPositions`.
 */
const BREAK_TYPES = new Set(['soft_break', 'hard_break'])

/**
 * A node's span CONTAINS its children's spans.
 *
 * The one structural rule a checker can apply without knowing what a node
 * covers, which is what makes it reach the nodes the slice comparison cannot:
 * a `text` node is the only one whose exact source text the tree carries, so
 * every block's span was checked for being present, integral and in range, and
 * never for pointing at the right place.
 *
 * It found 70 wrong spans the day it was written - 66 in carve-rs, 4 in
 * carve-php, none in carve-js - across list items, a figure's quote target, a
 * table's caption and a footnote's body (carve#565). Each was a span taken
 * before the rest of the node had been parsed.
 *
 * The nearest PLACED ancestor is the comparison, not the immediate parent: a
 * node may legitimately omit `pos` (PART 12 §4's reassembled clause), and
 * skipping past it keeps the rule from going quiet exactly where a span is
 * most likely to be wrong.
 */
function checkContainment(doc, findings) {
  const walk = (node, path, parent, parentPath) => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`, parent, parentPath))
      return
    }
    if (!node || typeof node !== 'object') return
    const placed = typeof node.type === 'string' && node.pos
    if (placed && parent) {
      const outside =
        node.pos.startOffset < parent.pos.startOffset || node.pos.endOffset > parent.pos.endOffset
      if (outside) {
        findings.push(
          `span outside its parent: "${node.type}" at ${path} ` +
            `[${node.pos.startOffset}, ${node.pos.endOffset}] is not inside ` +
            `"${parent.type}" at ${parentPath} [${parent.pos.startOffset}, ${parent.pos.endOffset}]`,
        )
      }
    }
    const nextParent = placed ? node : parent
    const nextPath = placed ? path : parentPath
    for (const [key, value] of Object.entries(node)) {
      if (key === 'pos') continue
      walk(value, `${path}.${key}`, nextParent, nextPath)
    }
  }
  walk(doc, '$', null, '$')
}

/**
 * PART 12 §4, over one document.
 *
 * Reports into `findings`; returns nothing. Offsets are CODEPOINT indices, so
 * the source is indexed the same way to check them.
 */
/*
 * Two kinds of sibling legitimately share source, for reasons that are rules
 * rather than accidents, so neither is compared:
 *
 *   HOISTED DEFINITIONS. PART 12 §7 makes a definition a child of the DOCUMENT
 *   wherever it was written, and its `pos` still records where that was - which
 *   is inside whatever container it was authored in. So a definition written
 *   inside a div is a document-level sibling of that div whose span sits inside
 *   it. That is the hoisting rule working.
 *
 *   ALL THREE KINDS, and the list is checked against the schema by
 *   tests/ast-positions.test.mjs rather than remembered. It held only the first
 *   two for a while after §10 added `link_reference_definition` - which hoists
 *   "exactly as §7 requires of the other two definition kinds" - so this checker
 *   reported a §4 sibling overlap for carve-php, the one engine that implements
 *   the node, every time a definition was authored inside a container.
 *
 *   BREAKS. A break is anchored at a line terminator, so two breaks meeting at
 *   one newline share that boundary without either being wrong.
 */
export const HOISTED_DEFINITION_TYPES = new Set([
  'footnote',
  'abbreviation_def',
  'link_reference_definition',
])

const EXEMPT_FROM_OVERLAP = new Set([...HOISTED_DEFINITION_TYPES, 'hard_break', 'soft_break'])

/**
 * SIBLING SPANS MUST NOT OVERLAP.
 *
 * This is what makes PART 12 §4's discontiguous-node rule enforceable. A node
 * whose content sits on non-adjacent lines carries the span of its FIRST
 * FRAGMENT; the tempting alternative, first-offset to last-offset, is forbidden
 * precisely because it swallows whatever sits between the fragments. In
 * corpus 64 that range contains the sibling cell `Apple` entirely, so two cells
 * would claim overlapping offsets and a consumer resolving a click to a node
 * could not tell which it hit.
 *
 * Checked between SIBLINGS rather than globally: a parent legitimately contains
 * its children (§4's containment rule), and only peers claiming the same source
 * is a contradiction. (carve#541)
 */
function checkSiblingOverlap(node, path, findings) {
  for (const [key, value] of Object.entries(node)) {
    if (key === 'pos' || !Array.isArray(value)) continue
    const placed = value
      .map((child, i) => [child, i])
      .filter(([c]) => c && typeof c === 'object' && c.pos &&
        Number.isInteger(c.pos.startOffset) && Number.isInteger(c.pos.endOffset) &&
        !EXEMPT_FROM_OVERLAP.has(c.type))
    for (let i = 1; i < placed.length; i++) {
      const [prev] = placed[i - 1]
      const [cur, idx] = placed[i]
      // Zero-width spans touching at a boundary are fine; a real overlap is not.
      if (cur.pos.startOffset < prev.pos.endOffset) {
        findings.push(
          `sibling spans overlap at ${path}.${key}[${idx}]: "${cur.type}" starts at ` +
            `${cur.pos.startOffset}, inside "${prev.type}" which ends at ${prev.pos.endOffset}`,
        )
      }
    }
  }
}

export function checkPositions(doc, source, findings) {
  checkContainment(doc, findings)
  const codepoints = [...source]
  for (const [node, path] of walkNodes(doc)) {
    checkSiblingOverlap(node, path, findings)
    // An unknown type is the schema's job now (it enumerates them, and the
    // enumeration is checked against docs/profiles.md in
    // tests/ast-schema.test.mjs). Checking it here too reported one defect
    // twice, in two wordings.
    const pos = node.pos
    if (pos === undefined) {
      // The document root is exempt: it spans the whole source by definition
      // (PART 12 section 4).
      if (node.type !== 'document') findings.push(`missing pos on "${node.type}" at ${path}`)
      continue
    }
    for (const key of POS_KEYS) {
      if (!Number.isInteger(pos[key])) {
        findings.push(`pos.${key} is not an integer on "${node.type}" at ${path}`)
      }
    }
    if (Number.isInteger(pos.startOffset) && Number.isInteger(pos.endOffset)) {
      if (pos.endOffset < pos.startOffset) {
        findings.push(`pos.endOffset < startOffset on "${node.type}" at ${path}`)
      }
      if (pos.endOffset > codepoints.length) {
        findings.push(`pos.endOffset past end of source on "${node.type}" at ${path}`)
      }
      // A span whose FIRST CHARACTER is a line terminator is wrong for
      // everything except a break. No construct begins with the newline that
      // ended the line before it, so this needs no knowledge of what the node
      // covers - which is the point: the slice comparison below can only run on
      // a `text` node, so on a paragraph, list item, table cell or block quote
      // a span that selects the wrong source read as a clean run. carve-php
      // gave a tab-containing line block a paragraph span starting at the
      // newline that ENDED the first stanza line, dropping that line from its
      // own paragraph, and every ast:check run to date passed it
      // (markup-carve/carve-php#669, carve#541).
      if (
        !BREAK_TYPES.has(node.type) &&
        pos.startOffset < codepoints.length &&
        (codepoints[pos.startOffset] === '\n' || codepoints[pos.startOffset] === '\r')
      ) {
        findings.push(
          `pos starts on a line terminator on "${node.type}" at ${path}: ` +
            `offset ${pos.startOffset} is the newline ending the line before it`,
        )
      }
      // A HARD BREAK COVERS THE MARKUP THE AUTHOR WROTE. Where a backslash
      // sits immediately before the newline, the break is that pair - so a
      // span that starts at the newline has left the backslash in no node at
      // all. carve-rs did exactly that until carve-rs#492, and nothing saw it:
      // a break renders as <br> whatever its span says (carve#549).
      //
      // A break the parser SYNTHESIZED - a line block's implied break, a
      // hard-break fence turning every newline into one - has no backslash
      // before it and is left alone, which is why the rule tests the source
      // rather than the node type.
      if (
        node.type === 'hard_break' &&
        codepoints[pos.startOffset] === '\n' &&
        pos.startOffset > 0 &&
        codepoints[pos.startOffset - 1] === '\\'
      ) {
        findings.push(
          `hard break span starts after its backslash on "${node.type}" at ${path}: ` +
            `offset ${pos.startOffset} is the newline, and the construct is the pair`,
        )
      }
      // THE UNIT, checked rather than assumed. PART 12 §4 counts codepoints, and
      // codepoints, UTF-16 units and bytes all agree on ASCII - so nothing here
      // distinguished them until this compared a span against the text it
      // claims to cover. A text node is the only node whose exact source text is
      // known from the AST alone.
      // A text node whose source contains a BACKSLASH is skipped: an escape is
      // resolved into the value, so `say\ hello` is four source characters
      // longer than the text it produces and can never equal its own slice. That
      // is the format working, not a wrong span, and asserting on it would
      // produce a false positive nobody would act on.
      // A value carrying the U+E000 INDENT SENTINEL is skipped for the same
      // reason. A line block rewrites each leading space to that private-use
      // character, so the node's value differs from its slice in exactly those
      // positions while spanning the same codepoints. The span is not wrong -
      // it covers precisely the source the node came from - and the engine's
      // internal spelling of an indent is not something this check can compare.
      if (
        node.type === 'text' &&
        typeof node.value === 'string' &&
        !node.value.includes('\ue000') &&
        !codepoints.slice(pos.startOffset, pos.endOffset).includes('\\')
      ) {
        const slice = codepoints.slice(pos.startOffset, pos.endOffset).join('')
        if (slice !== node.value) {
          findings.push(
            `pos does not cover the text it belongs to on "${node.type}" at ${path}: ` +
              `offsets give ${JSON.stringify(slice)}, node says ${JSON.stringify(node.value)}`,
          )
        }
      }
    }
    if (pos.startLine < 1 || pos.startColumn < 1) {
      findings.push(`pos lines/columns are 1-based; got ${pos.startLine}:${pos.startColumn}`)
    }
  }
}
