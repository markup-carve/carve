// Carve include-conformance PROOF RUNNER (Phase 1, carve-js reference).
//
// Reads every committed golden vector in tests/include-conformance/vectors/,
// re-runs it through carve-js via the shared driver, and asserts all FOUR
// fields (html, fmt, warnings, dependencies) against the golden. This proves
// the JSON format round-trips and the goldens are self-consistent with the
// reference engine. It also re-checks the per-vector I7 no-leak guard and the
// I12 expand-of-formatted equivalence property.
//
// This test uses a built carve-js with named-region support. CI checks out
// that revision separately from the corpus engine pin. Run it locally with:
//
//   CARVE_JS=/path/to/carve-js npm run test:includes
//
// Phase 2 vendors tests/include-conformance/ into carve-js / carve-php /
// carve-rs and wires an equivalent runner into each engine's own CI.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { loadCarve, runVector, EXPECTED_FIELDS } from '../scripts/include-conformance-lib.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const VECTOR_DIR = path.join(HERE, 'include-conformance', 'vectors')
const astSchema = JSON.parse(readFileSync(path.join(HERE, '..', 'resources', 'ast-schema.json'), 'utf8'))
const validateAst = new Ajv2020({ allErrors: true, strict: true }).compile(astSchema)

const files = readdirSync(VECTOR_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()

const { mod: carve, from } = await loadCarve()
console.log(`include-conformance: ${files.length} vectors, carve-js from ${from}`)

for (const file of files) {
  const vector = JSON.parse(readFileSync(path.join(VECTOR_DIR, file), 'utf8'))
  test(`${vector.name} [${vector.rules.join(', ')}]`, () => {
    const result = runVector(vector, carve)

    for (const field of EXPECTED_FIELDS) {
      assert.deepEqual(
        result[field],
        vector.expected[field],
        `${vector.name}: ${field} mismatch`,
      )
    }
    if (vector.checkWarningLocations) {
      assert.deepEqual(
        result.warningLocations,
        vector.expected.warningLocations,
        `${vector.name}: warning source location mismatch`,
      )
    }
    if (vector.checkPositions) {
      assert.deepEqual(result.positions, vector.expected.positions, `${vector.name}: positions mismatch`)
      const valid = validateAst({ ...result.astJson, astVersion: carve.AST_CONTRACT_VERSION })
      assert.ok(valid, `${vector.name}: expanded AST fails schema: ${JSON.stringify(validateAst.errors)}`)
    }

    // I7: no forbidden substring (a raw resolver error, an absolute path) may
    // reach any warning message.
    for (const forbidden of vector.forbiddenSubstrings ?? []) {
      for (const message of result.rawWarningMessages) {
        assert.ok(
          !message.includes(forbidden),
          `${vector.name}: warning message leaked ${JSON.stringify(forbidden)} (I7)`,
        )
      }
    }

    // I12 stronger invariant: expanding the formatted document matches.
    if (vector.checkFmtExpandEquivalence) {
      assert.ok(result.formattedRun, `${vector.name}: expected a formatted run`)
      assert.equal(result.formattedRun.html, result.html, `${vector.name}: fmt-expand html drift`)
      assert.deepEqual(
        result.formattedRun.dependencies,
        result.dependencies,
        `${vector.name}: fmt-expand dependency drift`,
      )
    }
  })
}
