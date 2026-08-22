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
 *
 * ONE BOUND OF TWO. This says a parent covers its children; it does not say the
 * parent STOPS there, and for as long as it was the only containment rule a
 * container could reach arbitrarily far past everything in it and read as clean.
 * `checkStopsAtChildren` below is the other bound (carve#1522, carve#1524).
 *
 * ITS OWN PASS, deliberately (carve#913). The opening-markup convention ruled
 * there points the same way - a span covering the construct's markup contains
 * the children inside it - and a checker that derived containment from that
 * convention would go quiet, with nothing failing, the day the convention was
 * revisited. So this is separate, exported, and RETURNS THE NUMBER OF PAIRS IT
 * COMPARED: a containment pass that examined nothing reports zero findings and
 * is indistinguishable from a clean one, which is the shape carve#755
 * catalogues.
 */
export function checkContainment(doc, findings) {
  let compared = 0
  const walk = (node, path, parent, parentPath) => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`, parent, parentPath))
      return
    }
    if (!node || typeof node !== 'object') return
    const placed = typeof node.type === 'string' && node.pos
    if (placed && parent) {
      compared += 1
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

  return compared
}

/**
 * A CONTAINER STOPS AT ITS LAST PLACED CHILD.
 *
 * The other half of `checkContainment`, and the half that was never written:
 * covering every child is one bound, and a checker that tests only that one
 * passes a container whose span runs arbitrarily far past everything in it.
 *
 * All three engines published
 *
 *     - a
 *
 *       [r]: /u
 *
 * with the `list` ending at 14 and its only `list_item` ending at 3, so the
 * offsets between them sat in a node the TREE says is a document-level sibling
 * - the definition, hoisted out by PART 12 §7 - and two nodes claimed offset 8.
 * Ruled at carve#1522: hoisting breaks the correspondence between tree nesting
 * and source nesting, and a span follows the tree. And they published
 *
 *     - a
 *       {.x}
 *     tail
 *
 * with the `list` covering an attribute block that attaches to nothing and
 * yields no child, which §4 excludes by name - "a following line terminator,
 * blank line, or unattached attribute block does not [belong] and is excluded"
 * (carve#1524).
 *
 * NOTHING SAW EITHER, because the three-way span panel in
 * scripts/ast-conformance.mjs compares the engines against EACH OTHER and the
 * three agreed byte for byte. A rule every engine breaks the same way is
 * structurally invisible to a comparison - the carve#755 family - so this rule
 * reads the SOURCE, which is the only party to the question that cannot agree
 * with an engine by accident.
 *
 * NOR DID THE OVERLAP RULE, which does run over document-level siblings but
 * exempts every hoisted definition kind by name (`EXEMPT_FROM_OVERLAP`, below).
 * The exemption is load-bearing and stays: a definition written inside a `:::`
 * div is a document-level sibling whose span sits inside a div that legitimately
 * ends at its own closer, and no ruling makes that pair stop overlapping. What
 * carve#1522 settles is the CLOSERLESS case, where the container had no reason
 * to reach that far in the first place.
 *
 * A TYPE SET, for the reason `OPENING_MARKUP` is one: only the type says
 * whether a node has a closer, and §4 ends a container "at their closer, or at
 * their last child when they have no closer". Everything absent here has
 * something after its last child that it does own, and each is absent for a
 * stated reason rather than an oversight:
 *
 *   `div`, `admonition`, `line_block`, `figure_group` and `code_block` end at a
 *   fence closer, `table_row` at its trailing pipe, and every inline container
 *   at its closing delimiter run and whatever attribute block is attached to it.
 *   `table` reaches past its last row over the alignment row, which produces no
 *   node in any engine (carve#1344) and is the table's own markup rather than a
 *   child's.
 *
 * AND `definition_list` IS ABSENT FOR A REASON THAT IS NOT A RULE. It answers
 * the floating-attribute question the OTHER way - it reaches the attribute line
 * no child covers, ruled at carve#1281 and pinned by
 * `329-a-floating-attribute-is-scoped-to-the-container-that-holds-it-5`. So the
 * language says one thing for a list and the opposite for a definition list.
 * That is a live inconsistency rather than a gap in this check, and folding it
 * in here would settle a second question in passing.
 *
 * An absent type is a type this rule does not reach, never a type permitted
 * anything: containment, overlap, the terminator rule and the slice comparison
 * all still apply to it.
 *
 * A TRAILING BLANK RUN IS NOT CARVED OUT, and the decision is worth stating
 * because the first draft of this rule did carve it out. carve-js and carve-rs
 * end a list after the blank run that follows it and carve-php does not
 * (markup-carve/carve-js#1304, markup-carve/carve-rs#1232), so the three-way
 * panel already reports that one and the tolerance looked free. It is not: a
 * container that stops at its last placed child cannot reach into a trailing
 * blank run at all, so the two are ONE defect seen from two sides, and a rule
 * that tolerated whitespace would have been a rule contradicting the ruling it
 * enforces. Those documents are declared with the rest and close with them.
 *
 * RETURNS THE NUMBER OF NODES IT EXAMINED, for the reason the two rules above
 * return their own counts: positions are an opt-in parse option in two of the
 * three engines, and zero findings out of zero nodes is the output of a clean
 * run and of a run that never happened.
 */
export const ENDS_AT_LAST_CHILD = new Set([
  'block_quote',
  'figure',
  'list',
  'list_item',
  'paragraph',
])

/**
 * What an EMPTY container of each kind is allowed to span: its own markup, and
 * the whitespace that separates that markup from the content it never got.
 *
 * A type with no entry is a type this rule leaves alone when it is empty - a
 * `paragraph` or a `figure` with no children at all is a different defect and
 * `checkContainment` and the schema are where it belongs.
 */
export const EMPTY_CONTAINER_MARKUP = new Map(
  Object.entries({
    block_quote: /^[ \t]*>[ \t]*$/,
    list: /^[ \t]*(?:[-+*]|[0-9]+[.)]|[A-Za-z]+[.)]|\.)[ \t]*$/,
    list_item: /^[ \t]*(?:[-+*]|[0-9]+[.)]|[A-Za-z]+[.)]|\.)[ \t]*$/,
  }),
)

export function checkStopsAtChildren(doc, codepoints, findings) {
  let examined = 0
  for (const [node, path] of walkNodes(doc)) {
    if (!ENDS_AT_LAST_CHILD.has(node.type)) continue
    const pos = node.pos
    if (!pos || !Number.isInteger(pos.startOffset) || !Number.isInteger(pos.endOffset)) continue
    // A STRUCTURAL CHILD IS NOT ALWAYS AN ARRAY ENTRY. A `figure` carries its
    // `target` as a SINGLE node, so a rule that only walked array-valued
    // properties saw a target-only figure as empty, skipped it for want of an
    // `EMPTY_CONTAINER_MARKUP` entry, and compared a captioned one against the
    // caption alone. `figure` would then have been a type this rule names and
    // never reaches - the carve#755 shape, in the very check written to close
    // one. Found by review, not by a run: the corpus figures all end at their
    // caption, so nothing failed either way.
    const children = []
    for (const [key, value] of Object.entries(node)) {
      if (key === 'pos') continue
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && typeof child.type === 'string') {
            children.push(child)
          }
        }
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        children.push(value)
      }
    }
    if (children.length === 0) {
      // A CONTAINER WITH NO PLACED CHILD AT ALL SPANS ITS OWN MARKUP AND STOPS
      // THERE. "Ends at its last placed child" is silent when there is none,
      // and that silence is three of the documents the engines still disagree
      // on: in the `381` family a collected definition empties the inner item,
      // so the extent question is live and the ruling did not reach it
      // (markup-carve/carve-rs#1233). Zero width was rejected - it is a shape
      // every consumer has to special-case and it discards the marker the
      // author typed - and so was the typed extent, which is what carve#1522
      // rejected for the non-empty case; allowing it only when a container is
      // empty would make the rule depend on child count.
      const markup = EMPTY_CONTAINER_MARKUP.get(node.type)
      if (!markup) continue
      examined += 1
      const slice = codepoints.slice(pos.startOffset, pos.endOffset).join('')
      if (!markup.test(slice)) {
        findings.push(
          `span covers more than its own markup on an empty "${node.type}" at ${path}: ` +
            `[${pos.startOffset}, ${pos.endOffset}] is ${JSON.stringify(slice)}, and an empty ` +
            'container spans the markup that opened it and stops there',
        )
      }
      continue
    }
    // A CHILD WITH NO USABLE POSITION SKIPS THE NODE, not just the child. §4
    // permits a reassembled node to omit `pos`, and where one does, the last
    // PLACED child is not the container's last child - so the bound this rule
    // would compare against is short by however much the unplaced child covers,
    // and every finding it produced would be false. A line block's spaced
    // content is exactly that case, and it is the one node in the corpus that
    // reaches here (`41-line-blocks-9`).
    if (children.some((child) => !child.pos || !Number.isInteger(child.pos.endOffset))) continue
    examined += 1
    const lastChildEnd = Math.max(...children.map((child) => child.pos.endOffset))
    if (pos.endOffset <= lastChildEnd) continue
    const tail = codepoints.slice(lastChildEnd, pos.endOffset).join('')
    findings.push(
      `span reaches past its last child on "${node.type}" at ${path}: ` +
        `it ends at ${pos.endOffset}, its last child ends at ${lastChildEnd}, and ` +
        `${JSON.stringify(tail)} belongs to no child of it`,
    )
  }

  return examined
}

/**
 * PART 12 §4: A SPAN BEGINS AT THE CONSTRUCT'S OPENING MARKUP (carve#913).
 *
 * One entry per node type opened by markup this checker can name from the
 * SOURCE alone. The pattern is matched at the span's start, after any leading
 * indentation on that line - the clause puts the indent inside the span,
 * because it is what places a nested item's marker.
 *
 * WHY A TABLE RATHER THAN A RULE PER NODE. Only the source can say whether a
 * span begins at the markup, and only the type says what that markup is. Every
 * other content-level rule in this file needs the node's own text to compare
 * against, which is why `text` was the only node any of them reached.
 *
 * WHAT IS DELIBERATELY ABSENT, each for a reason PART 12 §4 states:
 *
 *   `text`, `paragraph`, `abbreviation`, `smart_punctuation`, `figure` and the
 *   breaks open with no markup of their own, so there is nothing to point at.
 *   `table_cell` and `table_row` run BETWEEN the pipes - a cell claiming the
 *   `|` would overlap the cell before it.
 *   `emphasis` and `strong` carry the combined form's derived span: a slash
 *   and an asterisk around a word materialise the pair from ONE run of
 *   delimiters, and the inner node's span is the outer trimmed by two
 *   characters, so it legitimately starts at the content.
 *   `link_reference_definition` hoists to the root from wherever it was
 *   written, and the engines do not yet agree whether the container prefix on
 *   its line is inside its span. That is a live row in the span panel, not a
 *   settled marker.
 *
 * An absent type is a type this rule does not reach, never a type the rule
 * permits anything of: the containment, overlap, terminator and slice rules
 * all still apply to it.
 */
export const OPENING_MARKUP = new Map(
  Object.entries({
    abbreviation_def: /^\*\[/,
    admonition: /^:/,
    autolink: /^</,
    block_quote: /^>/,
    caption_number: /^#/,
    code: /^`/,
    code_block: /^[`~]/,
    comment: /^%/,
    critic_comment: /^\{/,
    definition_list: /^:/,
    delete: /^\{/,
    div: /^:/,
    footnote_ref: /^\[/,
    heading: /^#/,
    heading_ref: /^</,
    highlight: /^[={]/,
    image: /^!/,
    inline_extension: /^:/,
    inline_footnote: /^\^/,
    insert: /^\{/,
    line_block: /^:/,
    link: /^\[/,
    list: /^(?:[-+*]|[0-9]+[.)]|[A-Za-z]+[.)]|\.)/,
    list_item: /^(?:[-+*]|[0-9]+[.)]|[A-Za-z]+[.)]|\.)/,
    literal_inline: /^!/,
    math: /^\$/,
    mention: /^@/,
    raw_block: /^`/,
    raw_inline: /^`/,
    span: /^\[/,
    strike: /^[~{]/,
    subscript: /^\{/,
    substitution: /^\{/,
    superscript: /^\{/,
    symbol: /^:/,
    table: /^\|/,
    tag: /^#/,
    thematic_break: /^[-*_]/,
    underline: /^[_{]/,
  }),
)

/**
 * A span begins at the markup that opens the construct.
 *
 * Reports into `findings` and RETURNS THE NUMBER OF SPANS IT EXAMINED, for the
 * reason `checkContainment` returns its own count: positions are an opt-in
 * parse option in two of the three engines, so a probe that did not request
 * them hands this rule a tree with no `pos` anywhere and it reports nothing at
 * all. Zero findings and zero examined are the same output from a clean run
 * and from a run that never happened.
 */
export function checkOpeningMarkup(doc, codepoints, findings) {
  let examined = 0
  for (const [node, path] of walkNodes(doc)) {
    const pattern = node.type === 'comment' && node.delimited === true
      ? /^\{%/
      : OPENING_MARKUP.get(node.type)
    if (!pattern) continue
    const pos = node.pos
    if (!pos || !Number.isInteger(pos.startOffset) || !Number.isInteger(pos.endOffset)) continue
    if (pos.startOffset > codepoints.length) continue
    let at = pos.startOffset
    while (at < pos.endOffset && (codepoints[at] === ' ' || codepoints[at] === '\t')) at += 1
    examined += 1
    // WIDE ENOUGH FOR THE LONGEST MARKER. An ordered marker is digits then a
    // delimiter, so a window that truncates before the delimiter turns a
    // well-formed item into a reported violation - a false finding, not a
    // missed one, which is the worse direction for a rule meant to be acted on.
    const ahead = codepoints.slice(at, at + 24).join('')
    if (!pattern.test(ahead)) {
      findings.push(
        `pos does not begin at the markup that opens "${node.type}" at ${path}: ` +
          `offset ${pos.startOffset} reaches ${JSON.stringify(ahead)}, which does not match ` +
          `${pattern}`,
      )
    }
  }

  return examined
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
  const codepoints = [...source]
  checkContainment(doc, findings)
  checkOpeningMarkup(doc, codepoints, findings)
  checkStopsAtChildren(doc, codepoints, findings)
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
