/*
 * A SECTION'S EXAMPLE NUMBERS ARE APPEND-ONLY TOO.
 *
 * generate-corpus.mjs already refuses to renumber a CATEGORY: a section that
 * has a number keeps it, and a new section may only take a number above the
 * current maximum. That guard compares `NN-slug` against `NN-slug`, so it is
 * blind to the other half of a corpus name. Inserting a pair MID-SECTION leaves
 * every category number where it was and shifts the EXAMPLE SUFFIXES after the
 * insertion point by one - `05-lists-24` becomes `05-lists-25`, and the new
 * pair takes the name the old one had.
 *
 * That is worse than a category renumber rather than milder, because it is
 * silent. A hand-written sidecar (`NN-slug-K.fmt`, `.md`) follows its case by
 * SLUG, so the rename in generate-corpus.mjs carries it to whatever document
 * now holds that name - a byte-exact expected output landing on an input that
 * never produced it. carve#1535 hit exactly this and worked around it by
 * appending at the end of the section, which is a convention nothing enforces
 * (carve#1536).
 *
 * WHY THE CHECK IS ON BYTES. Within a section an example has no name of its
 * own: `-24` is a POSITION, and a position is the one thing an insertion
 * changes, so comparing names to names can only ever report that a section
 * gained a pair. The document's identity has to be its `.crv` content. That
 * makes an EDIT to an existing example invisible here, which is correct - the
 * hash simply stops matching, nothing is reported as displaced, and the case
 * keeps its number. Only a document whose bytes are unchanged and whose number
 * is not gets named.
 *
 * Suffixes are compared rather than whole names, so a deliberate category
 * renumber (CORPUS_RENUMBER=1, which shifts every name in the section by its
 * prefix) is reported once by the category guard instead of once per example
 * here.
 */

const toSections = (rows) => {
  const bySlug = new Map()
  for (const row of rows) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, [])
    bySlug.get(row.slug).push(row)
  }
  return bySlug
}

// One hash may name at most one example within a section. Two examples in the
// same section with byte-identical input are indistinguishable here, so they
// are dropped rather than guessed at: reporting the wrong one of a pair as
// displaced is worse than reporting neither. The corpus has none today - 398
// sections, no within-section collision - and duplicates across sections are
// ordinary and unaffected, because the comparison never leaves a section.
const indexByHash = (rows) => {
  const byHash = new Map()
  for (const row of rows) {
    if (byHash.has(row.hash)) byHash.set(row.hash, null)
    else byHash.set(row.hash, row)
  }
  return byHash
}

/**
 * Report every example that keeps its bytes and changes its number.
 *
 * `previous` and `incoming` are rows of `{ name, slug, suffix, hash }`:
 * `name` is the corpus base (`05-lists-24`), `slug` is the section, `suffix`
 * is the 1-based example index within it, and `hash` identifies the `.crv`
 * bytes as they are written.
 */
export function displacedExamples(previous, incoming) {
  const before = toSections(previous)
  const after = toSections(incoming)
  const displaced = []
  for (const [slug, olds] of before) {
    const news = after.get(slug)
    // A category that is gone entirely, or one that is new, is the category
    // guard's to report.
    if (!news) continue
    const newByHash = indexByHash(news)
    for (const [hash, oldRow] of indexByHash(olds)) {
      if (oldRow === null) continue
      const newRow = newByHash.get(hash)
      // No match means the example's input was edited or removed. Neither is a
      // displacement, and neither is this guard's business.
      if (!newRow) continue
      if (newRow.suffix === oldRow.suffix) continue
      displaced.push({ from: oldRow.name, to: newRow.name })
    }
  }
  return displaced.sort((a, b) => a.from.localeCompare(b.from))
}

/**
 * Split a generated corpus filename into the row shape above.
 *
 * `NN-slug-K` is ambiguous on its face, because the first example of a section
 * carries no suffix and a section slug may itself end in a number: a heading
 * reading `## Version 2` produces `05-version-2`, which is one document called
 * `version-2` and not the second document of a section called `version`. Read
 * the wrong way, that section is never compared against its previous
 * generation and an insertion inside it goes unreported - a silent hole in the
 * guard, which is the shape carve#1536 exists to close rather than to move.
 *
 * `knownSlugs` is the set of slugs the example source declares, and it decides:
 * a name whose whole remainder is a declared slug is example 1 of that section.
 * Without one, the trailing run is read as the suffix, which is what the
 * category guard beside this has always done.
 *
 * WHAT IT STILL CANNOT SEE, stated rather than left to be rediscovered: a
 * section whose slug ends in a number and is RENAMED to the same slug without
 * the number - `version-2` to `version` - has no declared slug matching its old
 * files, so `05-version-2` reads as example 2 of `version` and the rename is
 * not reported. That is the parse the category guard has always used and this
 * changes nothing about it; closing it needs the PREVIOUS generation's section
 * slugs recorded somewhere, which is a persisted ledger rather than a parse.
 */
export function parseCorpusName(base, knownSlugs = null) {
  const m = /^(\d+)-(.+)$/.exec(base)
  if (!m) return null
  const [, idx, rest] = m
  if (knownSlugs?.has(rest)) return { name: base, idx, slug: rest, suffix: 1 }
  const split = /^(.*)-(\d+)$/.exec(rest)
  if (!split) return { name: base, idx, slug: rest, suffix: 1 }
  return { name: base, idx, slug: split[1], suffix: Number(split[2]) }
}
