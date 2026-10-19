/*
 * Corpus inputs permitted to be REFUSED by the executable spec (basenames, no
 * extension).
 *
 * Single source for the refusal ratchet, shared by `scripts/formal-core-check.mjs`
 * (which fails when the actual refused set differs in EITHER direction) and by
 * `tests/corpus.test.mjs` (which skips these rather than asserting on them).
 * Keeping one copy means a deliberate refusal cannot be allowed in one gate and
 * silently break the other.
 *
 * Table cell projection is specified by the normative grammar and corpus;
 * the executable oracle refuses it until its inline and resolution passes
 * implement the construct.
 */
export const REFUSED_ALLOW = new Set([
  '621-table-cell-value-references',
  '621-table-cell-value-references-2',
])
