/*
 * The sentences of docs/ast-json.md that other files CITE, quoted rather than
 * numbered.
 *
 * Every module that leans on a clause from that page used to point at it by
 * line: `docs/ast-json.md:116-117`, `:148-153`, `:427`, `:438`, `:108`. The page
 * grows, so all five drifted, and markup-carve/carve#965 tabulated the damage.
 * The correction that issue proposed - re-number them - was itself out of date
 * by the time it was written: it put the narrowing clause at 131 when the clause
 * is at 142, and reported `:113` as still landing on the §4 exception when 113
 * is the codepoint sentence. A line number cannot be maintained by hand against
 * a living page, and a citation nobody can check is the miniature of the defect
 * that issue is about.
 *
 * So a citation names a PHRASE. The phrase is checked - tests/ast-json-claims
 * asserts each of these occurs exactly once on the page - which means rewording
 * the clause fails until the citation is updated, and moving the paragraph costs
 * nothing. That is the opposite of the line-number trade.
 *
 * Matching collapses runs of whitespace on both sides, so an anchor may be
 * written on one line even where the page wraps it. Keep the backticks and the
 * asterisks: they are what makes several of these unique.
 */
export const PAGE_ANCHORS = {
  /** §4 is markup-inclusive. Cited by the span panel and its advice string. */
  markupInclusive: 'begins at the markup that opens the construct',

  /** §4's exemption for a node the producer reassembled. */
  reassembledExemption: '**may omit `pos` and is conformant doing so**',

  /** The reassembled cases, named one by one. */
  reassembledCases: 'A table cell continued on a `+` line, the hard break a line block makes',

  /** The exemption is for what CANNOT be placed, not for what has not been. */
  exemptionIsNarrow: 'covers nodes that *cannot* be placed, not nodes that have not been placed yet',

  /** The conformance test: a true span EXISTS, not a span was written down. */
  spanMustExist: 'whether a true span EXISTS rather than whether one was written down',
}

/** Whitespace-insensitive, so an anchor survives the page rewrapping a line. */
export const flatten = (text) => text.replace(/\s+/g, ' ')

/** How many times an anchor occurs in the page. Exactly one is the contract. */
export function countAnchor(page, phrase) {
  const haystack = flatten(page)
  const needle = flatten(phrase)
  let found = 0
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    found += 1
    at = haystack.indexOf(needle, at + 1)
  }

  return found
}
