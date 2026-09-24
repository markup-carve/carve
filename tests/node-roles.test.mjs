/*
 * The node-role table is DERIVED, and this is what keeps it derived.
 *
 * Which fields of a node hold other nodes is a fact only the schema knows, and
 * every engine has rediscovered it with a generator of its own. Those
 * generators do not capture the same amount of it - carve#2201 measured
 * carve-js deriving eight tables from the schema and carve-rs four - so a
 * schema change lands in one engine for free and needs a hand-written decoder
 * rule in the other. Publishing one table removes that asymmetry, and these
 * tests are what stop the published copy drifting from the schema it claims to
 * describe.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))
const table = JSON.parse(readFileSync(resolve(root, 'resources/node-roles.json'), 'utf8'))

test('the published table is current with the schema', () => {
  // `--check` regenerates and compares, so a schema change that nobody
  // regenerated for fails here rather than shipping a stale table.
  execFileSync(process.execPath, [resolve(root, 'scripts/generate-node-roles.mjs'), '--check'], {
    cwd: root,
  })
})

test('every position names types the schema declares', () => {
  const declared = new Set(
    Object.values(schema.$defs)
      .map((def) => def.properties?.type?.const)
      .filter((t) => typeof t === 'string'),
  )
  const unknown = []
  for (const [owner, fields] of Object.entries(table.roles)) {
    assert.ok(declared.has(owner), `${owner} is not a declared node type`)
    for (const [field, spec] of Object.entries(fields)) {
      for (const type of spec.admits ?? []) {
        if (!declared.has(type)) unknown.push(`${owner}.${field} -> ${type}`)
      }
    }
  }
  assert.deepEqual(unknown, [], `positions admitting undeclared types: ${unknown.join(', ')}`)
})

test('every node-holding field the schema declares has a role', () => {
  // The mirror direction. Without it the table could describe a subset and
  // still pass - which is the failure mode a per-engine generator already has.
  const missing = []
  for (const def of Object.values(schema.$defs)) {
    const owner = def.properties?.type?.const
    if (!owner || !def.properties) continue
    for (const [field, value] of Object.entries(def.properties)) {
      if (field === 'type' || field === 'attrs' || field === 'pos') continue
      const holdsNode =
        typeof value.$ref === 'string' ||
        Array.isArray(value.oneOf) ||
        (value.type === 'array' &&
          (typeof value.items?.$ref === 'string' ||
            Array.isArray(value.items?.anyOf) ||
            Array.isArray(value.items?.oneOf) ||
            typeof value.items?.items?.$ref === 'string'))
      if (!holdsNode) continue
      // `attrs`/`pos` are the only shared `$ref`s, and they are skipped above.
      if (table.roles[owner]?.[field] === undefined) missing.push(`${owner}.${field}`)
    }
  }
  assert.deepEqual(missing, [], `node positions with no role: ${missing.join(', ')}`)
})

test('a role is one of the three the contract names', () => {
  const roles = new Set(['node-sequence', 'node-matrix', 'single-node', 'record-sequence'])
  for (const [owner, fields] of Object.entries(table.roles)) {
    for (const [field, spec] of Object.entries(fields)) {
      assert.ok(roles.has(spec.role), `${owner}.${field} has role "${spec.role}"`)
      if (spec.role === 'record-sequence') assert.equal(spec.admits, undefined)
      else assert.ok(Array.isArray(spec.admits) && spec.admits.length > 0, `${owner}.${field}`)
    }
  }
})
