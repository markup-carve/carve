#!/usr/bin/env node
/**
 * Rewrite the vendored engine pin in package.json to a carve-js commit.
 *
 * A script rather than a `node -e` inside the workflow so the rewrite is
 * testable and so a mistyped regex cannot land as a silent no-op: an argument
 * that is not a full sha, or a file the pattern does not match, is an error
 * here instead of an unchanged file the bump then commits as if it had worked.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const PIN = /("@markup-carve\/carve":\s*"github:markup-carve\/carve-js#)([0-9a-f]{40})(")/

const sha = process.argv[2]
if (!/^[0-9a-f]{40}$/.test(sha ?? '')) {
  console.error('usage: set-engine-pin.mjs <40-character carve-js commit>')
  process.exit(2)
}

const path = process.argv[3] ?? 'package.json'
const before = readFileSync(path, 'utf8')
if (!PIN.test(before)) {
  console.error(`${path} carries no github:markup-carve/carve-js#<sha> pin to rewrite`)
  process.exit(1)
}

const after = before.replace(PIN, `$1${sha}$3`)
writeFileSync(path, after)
console.log(after === before ? `pin already at ${sha.slice(0, 8)}` : `pin set to ${sha.slice(0, 8)}`)
