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
      [...Object.keys(binding.importers), ...Object.keys(binding.outOfScopeImporters)].sort(),
      [...contract.optionalImporters].sort(),
      `${name} must declare each optional importer exactly once`,
    )
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
      if (implemented) assert.ok(binding.importers[importer].trim())
    }
  }
})

const importerSurfaces = {
  'carve-go': {
    file: 'carve.go',
    probes: {
      html: /^func\s+(?<api>FromHTML)\s*\(/m,
      markdown: /^func\s+(?<api>FromMarkdown)\s*\(/m,
      djot: /^func\s+(?<api>From(?:Djot|DJOT))\s*\(/m,
      bbcode: /^func\s+(?<api>From(?:Bbcode|BBCode))\s*\(/m,
    },
  },
  'carve-py': {
    file: 'src/lib.rs',
    probes: {
      html: /wrap_pyfunction!\s*\(\s*(?<api>from_html)\s*,/,
      markdown: /wrap_pyfunction!\s*\(\s*(?<api>from_markdown)\s*,/,
      djot: /wrap_pyfunction!\s*\(\s*(?<api>from_djot)\s*,/,
      bbcode: /wrap_pyfunction!\s*\(\s*(?<api>from_bbcode)\s*,/,
    },
  },
  'carve-rb': {
    file: 'lib/carve.rb',
    probes: {
      html: /^\s*def\s+(?:self\.)?(?<api>from_html)\s*\(/m,
      markdown: /^\s*def\s+(?:self\.)?(?<api>from_markdown)\s*\(/m,
      djot: /^\s*def\s+(?:self\.)?(?<api>from_djot)\s*\(/m,
      bbcode: /^\s*def\s+(?:self\.)?(?<api>from_bbcode)\s*\(/m,
    },
  },
  'carve-wasm': {
    file: 'src/lib.rs',
    probes: {
      html: /#\[wasm_bindgen\([^\]]*js_name\s*=\s*["']?(?<api>htmlToCarve)\b/,
      markdown: /#\[wasm_bindgen\([^\]]*js_name\s*=\s*["']?(?<api>fromMarkdown)\b/,
      djot: /#\[wasm_bindgen\([^\]]*js_name\s*=\s*["']?(?<api>migrateDjot)\b/,
      bbcode: /#\[wasm_bindgen\([^\]]*js_name\s*=\s*["']?(?<api>migrateBbcode)\b/,
    },
  },
}

test('binding importer declarations match pinned and current exports', async () => {
  await Promise.all(Object.entries(importerSurfaces).map(async ([name, surface]) => {
    const binding = contract.bindings[name]
    await Promise.all([binding.commit, 'main'].map(async (revision) => {
      const url = `https://raw.githubusercontent.com/markup-carve/${name}/${revision}/${surface.file}`
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
      assert.ok(response.ok, `${name}: cannot read ${url} (${response.status})`)
      const source = await response.text()
      for (const importer of contract.optionalImporters) {
        const api = source.match(surface.probes[importer])?.groups?.api
        assert.equal(
          api,
          binding.importers[importer],
          `${name} ${importer}: declared API differs from the export at ${revision}`,
        )
      }
    }))
  }))
})
