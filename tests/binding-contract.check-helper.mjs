import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const contract = JSON.parse(
  await readFile(new URL('../resources/binding-contract.json', import.meta.url), 'utf8'),
)

test('every carve-rs binding exposes every required output and declares every importer', () => {
  assert.deepEqual(Object.keys(contract.bindings).sort(), [
    'carve-go',
    'carve-py',
    'carve-rb',
    'carve-wasm',
  ])
  for (const [name, binding] of Object.entries(contract.bindings)) {
    assert.deepEqual(
      [...binding.outputs].sort(),
      [...contract.requiredOutputs].sort(),
      `${name} must expose the complete render-target set plus the AST`,
    )
    for (const importer of contract.optionalImporters) {
      const implemented = Object.hasOwn(binding.importers, importer)
      const declared = Object.hasOwn(binding.outOfScopeImporters, importer)
      assert.notEqual(
        implemented,
        declared,
        `${name} ${importer} import must be implemented or explicitly out of scope, never both`,
      )
      if (declared) assert.ok(binding.outOfScopeImporters[importer].trim())
    }
  }
})
