import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { exportProbe, isBindingSource, surfaceFindings } from './binding-importer-surface.helper.mjs'

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

const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
const api = async (url) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      accept: 'application/vnd.github+json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  })
  assert.ok(response.ok, `cannot read ${url} (${response.status})${token ? '' : ' - no GH_TOKEN in the environment, so this ran against the unauthenticated rate limit'}`)
  return response.json()
}

/*
 * The surface is the tree, not a file somebody named.
 *
 * Reading one path per binding made the whole check an assertion about where an
 * importer that does not exist yet would be written. carve-go ships two files
 * in the same package today; the one this used to read is not a promise about
 * the second.
 */
async function bindingSources(name, revision) {
  const tree = await api(`https://api.github.com/repos/markup-carve/${name}/git/trees/${revision}?recursive=1`)
  assert.ok(!tree.truncated, `${name}@${revision}: the tree came back truncated, so the surface read is partial`)
  const paths = tree.tree.filter((entry) => entry.type === 'blob' && isBindingSource(entry.path)).map((entry) => entry.path)
  assert.ok(paths.length, `${name}@${revision}: no source file matched, so nothing was read`)

  const sources = new Map()
  await Promise.all(paths.map(async (path) => {
    const url = `https://raw.githubusercontent.com/markup-carve/${name}/${revision}/${path}`
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
    assert.ok(response.ok, `${name}: cannot read ${url} (${response.status})`)
    sources.set(path, await response.text())
  }))
  return sources
}

test('the pinned surface each declaration rests on is reachable from main', async () => {
  await Promise.all(Object.entries(contract.bindings).map(async ([name, binding]) => {
    const compare = await api(`https://api.github.com/repos/markup-carve/${name}/compare/main...${binding.commit}`)
    assert.ok(
      ['identical', 'behind'].includes(compare.status),
      `${name}: the recorded commit ${binding.commit} is ${compare.status} relative to main, so the surface ` +
        'these declarations were measured against is not on the branch the binding ships from',
    )
  }))
})

test('binding importer declarations match the pinned and current surfaces', async () => {
  const failures = []
  await Promise.all(Object.entries(contract.bindings).map(async ([name, binding]) => {
    await Promise.all([binding.commit, 'main'].map(async (revision) => {
      const sources = await bindingSources(name, revision)
      for (const finding of surfaceFindings({
        binding,
        formats: contract.optionalImporters,
        sources,
        probe: exportProbe[name],
      })) {
        failures.push(`${name}@${revision}: ${finding}`)
      }
    }))
  }))
  assert.deepEqual(failures.sort(), [], failures.join('\n'))
})
