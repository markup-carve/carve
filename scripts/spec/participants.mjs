/*
 * A runner must know how many things it compared, and say so when that number is
 * not what it should be.
 *
 * carve#755 collects the recurring shape: a check that reports success without
 * having verified anything. Its second variant - "asserts over an empty set" -
 * accounts for three of the instances found so far: the optional-corpus
 * comparison that declared success over cases fewer than two engines reached
 * (carve#535), a carve-grammars sweep whose selector list was empty so the
 * negative assertion was trivially true, and pandoc-carve's corpus test reading a
 * dozen local fixtures instead of 548 documents.
 *
 * The fix each time was the same sentence written three different ways, so it is
 * one function here: state what you expected to compare, and fail when you did
 * not compare it. A count printed in a report is not that - a reader has to know
 * the right number to notice a wrong one.
 */

/**
 * @param {{label: string, actual: number, atLeast: number, of?: string, hint?: string}} spec
 * @returns {string | null} a finding, or null when the count is sufficient
 */
export function shortfall({ label, actual, atLeast, of, hint }) {
  if (!Number.isInteger(actual) || actual < 0) {
    return `${label}: participant count is ${actual}, which is not a count at all`
  }
  if (actual >= atLeast) return null
  const subject = of ? ` ${of}` : ''
  const because = hint ? ` ${hint}` : ''

  return (
    `${label}: compared ${actual}${subject} but expected at least ${atLeast}. ` +
    `A run over fewer than it should have is not a pass - it is a smaller ` +
    `question answered.${because}`
  )
}

/**
 * The same check for a runner that should have seen an EXACT population, e.g.
 * every file in a directory rather than a sample of it.
 *
 * Separate from `shortfall` on purpose: "at least N" cannot catch a run that
 * quietly grew a filter and now sees more than it should, which is how a
 * category can be counted twice.
 */
export function miscount({ label, actual, expected, of }) {
  if (actual === expected) return null
  const subject = of ? ` ${of}` : ''

  return `${label}: compared ${actual}${subject}, expected exactly ${expected}`
}
