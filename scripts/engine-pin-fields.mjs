#!/usr/bin/env node
/*
 * The binding's carve-lang pin, as `key=value` lines a workflow step appends to
 * GITHUB_OUTPUT.
 *
 * `ast-conformance.yml` read the pin with a `sed` of its own that matched only
 * `version = "…"`. carve-rb#185 moved the pin to a `git`/`rev` pair, the sed
 * matched nothing, and the step's own `test -n` killed four AST shards and the
 * full-corpus verdict on a repository whose commits had not touched any of it
 * (carve#2881). One rule in two spellings is what let the workflow's copy fall
 * behind the reader every other caller uses, so the workflow now asks this.
 */
import { pinnedEnginePin } from './lib/pinned-engine.mjs'

const manifest = process.argv[2]
if (!manifest) {
  console.error('usage: engine-pin-fields.mjs <path to the binding Cargo.toml>')
  process.exit(2)
}

const pin = pinnedEnginePin(manifest)
if (!pin) {
  // Still a hard failure: an unreadable pin means the comparison does not know
  // what it would be comparing against, which is worse than a red shard.
  console.error(`could not read the carve-lang pin in ${manifest}`)
  console.error('Expected either `version = "=X.Y.Z"` or a `git`/`rev` pair on the carve-lang line.')
  process.exit(1)
}

process.stdout.write(
  `kind=${pin.kind}\nvalue=${pin.value}\ngit=${pin.git ?? ''}\ncache=${pin.kind}-${pin.value}\n`,
)
