import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = readFileSync(resolve(root, 'scripts/shape-table.mjs'), 'utf8')

/*
 * THE ONE PROPERTY THIS SCRIPT HAS TO KEEP.
 *
 * `scripts/shape-table.mjs` exists because two cross-engine tables were built
 * from carve-js's PARSE-ONLY tree and compared against engines that resolve
 * inside their own parse (carve#1660, carve#1663). If someone ever "simplifies"
 * its carve-js exit back to `parse()`, the tool becomes the fastest way to
 * produce the exact table it was written to prevent - and it would still print a
 * confident verdict, because nothing downstream can tell which stage it read.
 *
 * So the guard is on the SOURCE rather than on a run: a full run needs three
 * engine checkouts and cannot happen in ordinary CI, which is precisely the
 * condition under which a check quietly stops checking.
 */
test('the carve-js exit is the published one, not parse()', () => {
  assert.match(
    script,
    /carveToAstJson/,
    'shape-table must read carve-js through carveToAstJson - its published exit',
  )
  // `parse(` may appear inside PROSE explaining the trap; what must never
  // appear is a call that takes a tree from it.
  const code = script
    .split('\n')
    .filter((line) => !/^\s*(\*|\/\*|\/\/)/.test(line))
    .join('\n')
  assert.doesNotMatch(
    code,
    /\b(lib|carve)\.parse\s*\(/,
    'shape-table must not read carve-js’s parse-only tree: that is the stage no other engine exposes',
  )
})

test('it refuses a two-engine table rather than printing one', () => {
  assert.match(
    script,
    /a majority needs all three engines/,
    'a run that cannot reach three engines must say so instead of printing a table',
  )
  assert.match(
    script,
    /process\.exit\(1\)/,
    'and it must exit non-zero, so a script wrapping it cannot read the refusal as a pass',
  )
})

test('every run states which exit it read', () => {
  assert.match(
    script,
    /PUBLISHED exit/,
    'a pasted table has to carry the stage it was read from, or the next reader cannot check it',
  )
})
