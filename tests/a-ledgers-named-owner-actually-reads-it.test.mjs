/*
 * A LEDGER'S `owner` IS THE ONE PLACE A READER LOOKS UP WHICH CHECK HONORS A
 * DECLARATION, AND IT WAS PROSE NOTHING VERIFIED.
 *
 * `resources/engine-fmt-drift.txt` named `npm run fmt:check`, which reads no
 * `resources/` file at all; its real reader is tests/corpus-fmt-roundtrip.test.mjs
 * and its two siblings, under `npm test` against the PIN. That is not a cosmetic
 * slip. A ruling on carve#2588 read the field, concluded a red cross-engine
 * formatter shard could be declared in that file, and nothing would have read the
 * declaration - `compare:impls --roundtrip` consults no ledger by design, so the
 * shard would have stayed red with a line in place saying it was accounted for.
 *
 * So the field is checked here the only way it can be: resolve the owner to an
 * entry module and walk its imports for the ledger's own name. That proves the
 * named check can SEE the file, not that it ratchets it - `guard: 'two-way'` and
 * the per-ledger tests cover the second question.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

process.env.CARVE_DECL_AUDIT_LIB = '1'
const { __internals } = await import('../scripts/declaration-audit.mjs')
const { MANIFEST } = __internals

const pkg = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8'))

/** The module an `owner` string starts at, or null when it names no runnable one. */
function entryModule(owner) {
  if (owner.startsWith('npm run ')) {
    const script = pkg.scripts[owner.slice('npm run '.length).split(' ')[0]]
    const found = script && /((?:scripts|tests)\/[\w./-]+\.m?js)/.exec(script)
    return found ? resolve(repo, found[1]) : null
  }
  return /\.m?js$/.test(owner) ? resolve(repo, owner) : null
}

/** Every module reachable from `file` through relative imports, including itself. */
function importGraph(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return seen
  seen.add(file)
  for (const match of readFileSync(file, 'utf8').matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const target = resolve(dirname(file), match[1])
    importGraph(/\.m?js$/.test(target) ? target : `${target}.mjs`, seen)
  }
  return seen
}

/** Does the check `owner` names mention `ledgerPath` anywhere in its graph? */
function ownerReads(owner, ledgerPath) {
  const entry = entryModule(owner)
  if (entry === null) return null
  const name = basename(ledgerPath)
  for (const module of importGraph(entry)) {
    if (readFileSync(module, 'utf8').includes(name)) return true
  }
  return false
}

const ledgers = MANIFEST.filter((entry) => entry.repo === 'spec' && entry.kind === 'txt')

test('the txt ledgers are all present, so an empty filter cannot pass as a clean run', () => {
  assert.ok(ledgers.length >= 9, `found ${ledgers.length} spec txt ledgers in the manifest`)
})

test('every txt ledger names an owner that can read it', () => {
  const wrong = []
  for (const entry of ledgers) {
    const reads = ownerReads(entry.owner, entry.path)
    if (reads === null) {
      wrong.push(`${entry.path}: owner ${JSON.stringify(entry.owner)} names no runnable module`)
      continue
    }
    if (!reads) wrong.push(`${entry.path}: ${entry.owner} never reads it`)
  }
  assert.deepEqual(
    wrong,
    [],
    'a ledger names an owner that cannot see it, so a declaration in it is excusing nothing:\n  ' +
      `${wrong.join('\n  ')}`,
  )
})

// THE CONTROL. A resolver that answered "reads it" for everything would pass the
// test above with the defect still in place, so the exact wrong pairing that
// carve#2588 tripped over is asserted to come back false.
test('the resolver reports a wrong owner as wrong', () => {
  assert.equal(ownerReads('npm run fmt:check', 'resources/engine-fmt-drift.txt'), false)
  assert.equal(ownerReads('npm run ast:check', 'resources/ast-value-divergence.txt'), true)
  assert.equal(ownerReads('by hand', 'resources/engine-fmt-drift.txt'), null)
})
