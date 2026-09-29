// Golden generator for the include-conformance corpus.
//
// Reads the authored vector INPUTS (scripts/include-conformance-vectors.mjs),
// runs each through carve-js via the shared driver, and writes a self-contained
// tests/include-conformance/vectors/<name>.json with the four `expected` fields
// filled in. Also (re)writes tests/include-conformance/manifest.json with the
// rule-coverage map.
//
// Re-runnable: run it again after a deliberate carve-js behavior change to
// regenerate every golden. FAILS LOUDLY if a vector throws, if a
// forbiddenSubstrings guard leaks, if a checkFmtExpandEquivalence property does
// not hold, or if a committed golden has no authored input -- neither a broken
// vector nor a lost one is ever silently baked into the corpus.
//
//   node scripts/gen-include-conformance.mjs
//   node scripts/gen-include-conformance.mjs --prune   # also drop goldens whose
//                                                      # input was deleted
//
// Requires a built carve-js (see scripts/include-conformance-lib.mjs loadCarve).

import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import assert from 'node:assert/strict'
import { vectors } from './include-conformance-vectors.mjs'
import { loadCarve, runVector } from './include-conformance-lib.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(HERE, '..', 'tests', 'include-conformance', 'vectors')
const MANIFEST = path.resolve(HERE, '..', 'tests', 'include-conformance', 'manifest.json')

const PRUNE = process.argv.includes('--prune')

/** Fields carried verbatim from the authored input into the committed vector. */
const INPUT_FIELDS = [
  'name',
  'description',
  'rules',
  'mode',
  'resolver',
  'entry',
  'files',
  'tree',
  'entryPath',
  'root',
  'options',
  'forbiddenSubstrings',
  'checkFmtExpandEquivalence',
  'checkCarveTarget',
  'checkFlattened',
]

function inputOf(vector) {
  const out = {}
  for (const key of INPUT_FIELDS) {
    if (vector[key] !== undefined) out[key] = vector[key]
  }
  return out
}

function assertNoLeak(vector, rawMessages) {
  for (const forbidden of vector.forbiddenSubstrings ?? []) {
    for (const message of rawMessages) {
      assert.ok(
        !message.includes(forbidden),
        `Vector "${vector.name}": warning message leaked forbidden substring ${JSON.stringify(
          forbidden,
        )} (I7). Message: ${JSON.stringify(message)}`,
      )
    }
  }
}

function assertFmtExpandEquivalence(vector, result) {
  if (!vector.checkFmtExpandEquivalence) return
  assert.ok(result.formattedRun, `Vector "${vector.name}": expected a formatted run`)
  assert.equal(
    result.formattedRun.html,
    result.html,
    `Vector "${vector.name}": expanding the formatted document changed the HTML (I12 stronger invariant).`,
  )
  assert.deepEqual(
    result.formattedRun.dependencies,
    result.dependencies,
    `Vector "${vector.name}": expanding the formatted document changed the dependency set (I12 stronger invariant).`,
  )
}

async function main() {
  const { mod: carve, from } = await loadCarve()
  console.log(`Using carve-js from ${from}`)

  mkdirSync(OUT_DIR, { recursive: true })

  // Reject duplicate names up front -- they would clobber each other's files.
  const seen = new Set()
  for (const v of vectors) {
    assert.ok(!seen.has(v.name), `Duplicate vector name: ${v.name}`)
    seen.add(v.name)
  }

  // A committed golden with no authored input is either a vector somebody added
  // as JSON or one whose input was just deleted. Those want opposite outcomes and
  // the generator cannot tell them apart, so it refuses and names them rather
  // than deleting committed cases on a routine re-run (carve#2630). --prune is
  // the deliberate second answer.
  const wanted = new Set([...seen].map((n) => `${n}.json`))
  const orphans = readdirSync(OUT_DIR)
    .filter((file) => file.endsWith('.json') && !wanted.has(file))
    .sort()
  if (orphans.length > 0) {
    if (!PRUNE) {
      throw new Error(
        `${orphans.length} committed vector(s) have no authored input in ` +
          `scripts/include-conformance-vectors.mjs:\n` +
          orphans.map((file) => `  ${file}`).join('\n') +
          `\nRegenerating would DELETE them and drop their manifest rows. Author an ` +
          `input for each, or re-run with --prune to remove them deliberately.`,
      )
    }
    for (const file of orphans) rmSync(path.join(OUT_DIR, file))
    console.log(`Pruned ${orphans.length} golden(s) with no authored input:`)
    for (const file of orphans) console.log(`  ${file}`)
  }

  const coverage = new Map()
  for (const vector of vectors) {
    let result
    try {
      result = runVector(vector, carve)
    } catch (e) {
      throw new Error(`Vector "${vector.name}" threw while running: ${e.stack ?? e}`)
    }
    assertNoLeak(vector, result.rawWarningMessages)
    assertFmtExpandEquivalence(vector, result)

    const record = {
      ...inputOf(vector),
      expected: {
        html: result.html,
        fmt: result.fmt,
        // I15, only where the vector asks for it: the Carve output a processor
        // produces WITH the resolver configured.
        ...(vector.checkFlattened ? { flattened: result.flattened } : {}),
        ...(vector.checkCarveTarget ? { carveTarget: result.carveTarget } : {}),
        warnings: result.warnings,
        dependencies: result.dependencies,
      },
    }
    writeFileSync(path.join(OUT_DIR, `${vector.name}.json`), JSON.stringify(record, null, 2) + '\n')

    for (const rule of vector.rules) {
      if (!coverage.has(rule)) coverage.set(rule, [])
      coverage.get(rule).push(vector.name)
    }
  }

  const manifest = {
    description:
      'Rule-coverage map for the Carve include-conformance corpus (PART 9 §19). ' +
      'Generated by scripts/gen-include-conformance.mjs -- do not edit by hand.',
    total: vectors.length,
    rules: Object.fromEntries(
      [...coverage.entries()].sort(([a], [b]) => a.localeCompare(b, 'en')),
    ),
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

  console.log(`Wrote ${vectors.length} vectors to ${path.relative(process.cwd(), OUT_DIR)}`)
  console.log(`Rules covered: ${[...coverage.keys()].sort().join(', ')}`)
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
