/*
 * The citation patterns the normativity gate scans with.
 *
 * They live here rather than inside the gate so their behavior can be
 * exercised against synthetic prose. The gate itself can only ever say "the
 * tree is clean", which is the same answer a pattern that matches nothing
 * gives - the shape carve#755 collects.
 *
 * WHAT WENT WRONG (carve#1395). A citation was matched with a single literal
 * space between `PART N` and the clause it names. Prose in this repo is
 * hard-wrapped, so `PART 11` and `§10d` land on different lines routinely, and
 * every one of those citations was invisible to the gate. It was found by luck:
 * while cutting 0.1.3 an agent spelled a RETIRED clause as a citation, CI went
 * green, and it went green only because a wrap happened to fall between the
 * part number and the clause. Twelve real citations across the docs, the
 * grammar and the changelog were unscanned at the commit that fix landed on.
 *
 * WHAT THE FIX MAY NOT DO. Stripping line breaks altogether would close the
 * hole and open a worse one: a reference at the end of one paragraph and a
 * clause at the start of the next would fuse into a citation nobody wrote, and
 * the gate would report a dangling clause against prose that is correct. A
 * gate that reports defects that are not there is abandoned as fast as one that
 * reports none.
 *
 * So the gap crosses a SOFT WRAP and never a paragraph break.
 */

/** Horizontal whitespace: a space or a tab, never a line break. */
const H = String.raw`[^\S\r\n]`

/*
 * One gap character. A line break is admitted only when another does not
 * follow it, so `a\n  b` is one gap and `a\n\nb` is no gap at all - the second
 * newline is refused, and with it the whole run, because the run has to start
 * at the first.
 */
const GAP = String.raw`(?:${H}|\r?\n(?!${H}*\r?\n))`

/** A gap that must be there (`PART 9` and its clause are separate tokens). */
export const GAP1 = `${GAP}+`

/** A gap that may be absent (`§1,§2` is as legitimate as `§1, §2`). */
export const GAP0 = `${GAP}*`

/** A clause label: `3`, `10d`, `24`. */
export const CLAUSE = String.raw`\d+[a-z]?`

/*
 * The trailing clauses of a citation GROUP, matched whole so multi-section
 * shorthand reaches every clause it names and not only the first:
 * `PART 9 §1, §9 and §10`, `PART 12 §1-2`.
 */
const TAIL = `(?:${GAP0}(?:,|&|and|or|to|–|-)${GAP0}§?${CLAUSE})*`

/**
 * `PART N §M` and `PART N section M`, in either wrapped or unwrapped prose.
 *
 * The PART NUMBER is captured from the citation, never iterated over the parts
 * the grammar happens to have: building one pattern per known part would skip
 * a citation into a part number that does not exist at all, and one into a
 * part that exists but has no sections.
 *
 * A fresh RegExp per call, because these carry the `g` flag and therefore
 * `lastIndex` state.
 */
export const qualifiedCitation = () =>
  new RegExp(`PART (\\d+)${GAP1}(?:§|section${GAP1})(${CLAUSE})(${TAIL})`, 'g')

/** A bare `§M` group, for the pages whose bare clause references mean PART 12. */
export const bareCitation = (lead) => new RegExp(`${lead}(${CLAUSE})(${TAIL})`, 'g')

/** Every clause label inside a matched tail. */
export const tailClauses = () => new RegExp(`§?(${CLAUSE})`, 'g')

/**
 * Every clause a citation group names, first and tail together.
 *
 * `onHit` is called once per clause, in source order.
 */
export const eachClause = (first, tail, onHit) => {
  onHit(first)
  for (const t of tail.matchAll(tailClauses())) onHit(t[1])
}
