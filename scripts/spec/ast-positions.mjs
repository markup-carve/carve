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
 * PART 12 §4, over one document.
 *
 * Reports into `findings`; returns nothing. Offsets are CODEPOINT indices, so
 * the source is indexed the same way to check them.
 */
export function checkPositions(doc, source, findings) {
  const codepoints = [...source]
  for (const [node, path] of walkNodes(doc)) {
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
