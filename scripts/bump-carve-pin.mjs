#!/usr/bin/env node
/*
 * Move the pinned `@markup-carve/carve` dependency to a carve-js commit.
 *
 * The spec repo consumes carve-js as a git dependency pinned to an exact
 * commit (package.json devDependencies) rather than vendoring its compiled
 * dist/. The pin is the single line that says which reference build the
 * corpus and Playground run against, so bumping it is a reviewable diff
 * instead of a few hundred rebuilt artifacts.
 *
 * Usage:
 *   node scripts/bump-carve-pin.mjs              # latest carve-js main
 *   node scripts/bump-carve-pin.mjs <sha|ref>    # a specific commit
 *
 * Only MERGED carve-js commits belong here. Pinning an unmerged branch build
 * reverts impl changes that landed after it, which is the failure mode the
 * old vendoring workflow kept hitting.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = resolve(repoRoot, 'package.json')
const REPO = 'https://github.com/markup-carve/carve-js.git'
const DEP = '@markup-carve/carve'

const requested = process.argv[2] ?? 'main'

/** Resolve a ref to a full commit sha without needing a local checkout. */
function resolveSha(ref) {
  if (/^[0-9a-f]{40}$/i.test(ref)) return ref.toLowerCase()
  const out = execFileSync('git', ['ls-remote', REPO, ref], { encoding: 'utf8' })
  const sha = out.split(/\s+/)[0]
  if (!/^[0-9a-f]{40}$/i.test(sha ?? '')) {
    throw new Error(`could not resolve carve-js ref "${ref}" (got: ${out.trim() || 'nothing'})`)
  }
  return sha.toLowerCase()
}

const sha = resolveSha(requested)
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const before = pkg.devDependencies?.[DEP]
if (before === undefined) throw new Error(`${DEP} is not a devDependency of package.json`)

const after = `github:markup-carve/carve-js#${sha}`
if (before === after) {
  console.log(`${DEP} already pinned to ${sha}`)
  process.exit(0)
}

pkg.devDependencies[DEP] = after
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

console.log(`${DEP}\n  from ${before}\n  to   ${after}\n`)
console.log('Now run:\n  npm install\n  npm test\n  npm run core:check')
