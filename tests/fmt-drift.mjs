/*
 * Shared loader for the two declared-drift files consulted by any test that
 * reads the pinned build's OWN output back through itself or the oracle:
 * `resources/engine-pin-drift.txt` (direct render drift) and
 * `resources/engine-fmt-drift.txt` (writer-only drift - see that file's own
 * header for why it is kept separate rather than folded into the first).
 *
 * Both files share the same format (`<slug><two spaces><reason>`), so one
 * parser serves both, and consumers that need "is this slug excused for a
 * round-trip or cross-read purpose" want the UNION of the two, not either one
 * alone.
 */
import { resolve } from 'node:path'
import { parseDriftLedger } from '../scripts/lib/drift-ledger.mjs'

/*
 * The shared parser rather than a local one, so a slug listed twice is refused
 * here too. Reading these files into a Set hid the loss even better than the
 * Map in `scripts/engine-report.mjs` did - a Set has no reason to discard, so
 * there was nothing to notice missing (carve#1479). It also removes a second
 * silent failure this loader had of its own: with no two-space run on a line,
 * `search` returned -1 and `slice(0, -1)` quietly registered the slug with its
 * last character chopped off, which would have excused nothing under a name
 * nothing else uses.
 */
const parseDriftFile = (path) => [...parseDriftLedger(path).keys()]

/**
 * @param {string} testsDir the directory of the calling test file (`__dirname`
 *   equivalent), so the relative path to `resources/` resolves regardless of
 *   the caller's own location.
 * @returns {Set<string>} slugs declared in EITHER drift file.
 */
export function loadDeclaredFmtDrift(testsDir) {
  const resourcesDir = resolve(testsDir, '..', 'resources')
  return new Set([
    ...parseDriftFile(resolve(resourcesDir, 'engine-pin-drift.txt')),
    ...parseDriftFile(resolve(resourcesDir, 'engine-fmt-drift.txt')),
  ])
}

/**
 * The WRITER-ONLY file on its own, for the staleness ratchet.
 *
 * `npm run engine:report -- --check` fails in either direction on
 * `engine-pin-drift.txt`, so a line there cannot outlive the drift it names.
 * Nothing did that for `engine-fmt-drift.txt`: it was read only through the
 * union above, where a slug's only effect is to EXCUSE a failure. A line that
 * stopped being true would have gone on excusing nothing, silently, forever -
 * the shape carve#755 catalogs. That went unnoticed because the file was empty
 * from the day it was added until carve#1197, so the missing ratchet had
 * nothing to be wrong about yet.
 *
 * The union is deliberately not reused here: a slug in the PIN file names a
 * render divergence and need not drift on the writer side at all, so asserting
 * it does would fail for the wrong reason.
 *
 * @param {string} testsDir see `loadDeclaredFmtDrift`.
 * @returns {Set<string>} slugs declared in `engine-fmt-drift.txt` only.
 */
export function loadWriterOnlyDrift(testsDir) {
  return new Set(parseDriftFile(resolve(testsDir, '..', 'resources', 'engine-fmt-drift.txt')))
}
