#!/usr/bin/env node
/**
 * Read or rewrite the vendored engine pin in package.json.
 *
 * `--current` prints the pinned carve-js commit; a sha rewrites it.
 *
 * ONE READER FOR BOTH HALVES, and that is the point rather than tidiness: the
 * first version of the bump workflow read the pin inline with
 * `dependencies['@markup-carve/carve']`, the pin lives in `devDependencies`,
 * and the job died on `Cannot read properties of undefined` the first time it
 * ran. A rewrite that cannot find the pin, or a sha that is not one, is an
 * error here rather than an unchanged file the job commits as a bump.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const PIN = /("@markup-carve\/carve":\s*"github:markup-carve\/carve-js#)([0-9a-f]{40})(")/
const PKG = 'package.json'

const [arg, path = PKG] = process.argv.slice(2)
const before = readFileSync(path, 'utf8')
const found = before.match(PIN)

if (!found) {
  console.error(`${path} carries no github:markup-carve/carve-js#<sha> pin`)
  process.exit(1)
}

if (arg === '--current') {
  console.log(found[2])
  process.exit(0)
}

if (!/^[0-9a-f]{40}$/.test(arg ?? '')) {
  console.error('usage: set-engine-pin.mjs (--current | <40-character carve-js commit>) [package.json]')
  process.exit(2)
}

writeFileSync(path, before.replace(PIN, `$1${arg}$3`))
console.log(arg === found[2] ? `pin already at ${arg.slice(0, 8)}` : `pin set to ${arg.slice(0, 8)}`)
