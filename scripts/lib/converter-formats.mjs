/*
 * The pairing rule for the CONVERTER corpus (tests/corpus-convert/), the
 * mirror of ./corpus-targets.mjs with the arrow reversed: a render target maps
 * to an expected-output extension there, a source FORMAT maps to an input
 * extension here. One place, for the same reason - the per-PR test and the
 * cross-engine runner both read cases off the directory, and two spellings of
 * "which formats exist" is how a case goes silently unreachable in one of
 * them (carve#1130, the gap this corpus closes).
 */

/** Source format -> the input file extension its cases carry. */
export const FORMAT_EXTENSIONS = {
  markdown: 'md',
  html: 'html',
  bbcode: 'bbcode',
  djot: 'djot',
}

/** The reverse lookup: `input.md` -> `markdown`. */
export function formatOfExtension(ext) {
  for (const [format, extension] of Object.entries(FORMAT_EXTENSIONS)) {
    if (extension === ext) return format
  }
  return null
}

/*
 * Importers an engine DOES NOT HAVE, declared per engine with the reason.
 *
 * The render corpus skips a target an engine does not implement, and the
 * optional corpus prints a NOT COMPARED roll-up for a case that reached fewer
 * than two engines - in both, absence is visible and explained. This is the
 * converter corpus's spelling of the same rule: a case whose format an engine
 * has no importer for is SKIPPED for that engine and reported against this
 * table, and a format that is neither convertible nor declared here is a hard
 * error rather than a silent skip.
 *
 * CHECKED IN BOTH DIRECTIONS by the runner (scripts/compare-impls.mjs,
 * --corpus=convert): a declared gap the engine has quietly closed is a STALE
 * entry and fails, so the table cannot outlive the gap it describes - the
 * discipline resources/engine-pin-drift.txt already follows.
 *
 * Engine names are the runner's (`rust`, `js`, `php`), and the coverage they
 * record was measured on carve#1130 (comment of 2026-08-12, corrected the same
 * day) and re-verified against the checkouts when this file was written.
 */
export const UNIMPLEMENTED_IMPORTERS = {
  rust: {},
  js: {},
  php: {},
}
