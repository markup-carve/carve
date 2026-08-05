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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const parseDriftFile = (path) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.slice(0, l.search(/\s{2,}/)))

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
