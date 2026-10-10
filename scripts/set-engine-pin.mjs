#!/usr/bin/env node
/**
 * Read or rewrite the engine revisions this repository pins.
 *
 * `resources/engine-pins.json` is the record, and it is the record because a
 * human reviews it: every CI job here used to check its engines out at `main`,
 * or resolve `commits/main` at the moment the run began, which is the same
 * float one step removed. An unrelated engine merge then reddened every open
 * pull request on an assertion none of them touched, and the gate could not
 * tell "this change broke something" from "another repository moved"
 * (carve#2869). Now an engine merge arrives through
 * `.github/workflows/bump-engine-pin.yml` as one reviewable change.
 *
 * `package.json` carries the carve-js pin a second time, because npm needs a
 * dependency spec and cannot read this file. The script writes both, and
 * tests/engine-pins.test.mjs fails if they ever disagree - two spellings of one
 * rule is how the AST conformance pin reader fell behind (carve#2881).
 *
 * ONE READER FOR EVERY CALLER, and that is the point rather than tidiness: the
 * first version of the bump workflow read the pin inline with
 * `dependencies['@markup-carve/carve']`, the pin lives in `devDependencies`,
 * and the job died on `Cannot read properties of undefined` the first time it
 * ran. A rewrite that cannot find the pin, or a sha that is not one, is an
 * error here rather than an unchanged file the job commits as a bump.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PINS = resolve(root, 'resources/engine-pins.json')
const PKG = resolve(root, 'package.json')
/** The carve-js spec in package.json, which npm reads and this file cannot. */
const NPM_PIN = /("@markup-carve\/carve":\s*"github:markup-carve\/carve-js#)([0-9a-f]{40})(")/

export const ENGINES = ['js', 'php', 'rb', 'rs']

/** Every pinned revision, by engine. */
export function enginePins(file = PINS) {
  const { engines } = JSON.parse(readFileSync(file, 'utf8'))
  for (const engine of ENGINES) {
    if (!/^[0-9a-f]{40}$/.test(engines?.[engine] ?? '')) {
      throw new Error(`${file} has no 40-character pin for carve-${engine}`)
    }
  }
  return engines
}

/** The carve-js revision package.json pins, which must equal the js pin. */
export function npmEnginePin(file = PKG) {
  const found = readFileSync(file, 'utf8').match(NPM_PIN)
  if (!found) throw new Error(`${file} carries no github:markup-carve/carve-js#<sha> pin`)
  return found[2]
}

function setPin(engine, sha, { pinsFile = PINS, pkgFile = PKG } = {}) {
  const before = readFileSync(pinsFile, 'utf8')
  const pins = enginePins(pinsFile)
  if (!(engine in pins)) throw new Error(`carve-${engine} is not an engine this repo pins`)
  // A surgical replace, not a re-serialize: the file holds prose with
  // non-ASCII punctuation and a dump would rewrite more than the one pin.
  const line = new RegExp(`("${engine}":\\s*")${pins[engine]}(")`)
  if (!line.test(before)) throw new Error(`could not find the carve-${engine} pin to rewrite`)
  writeFileSync(pinsFile, before.replace(line, `$1${sha}$2`))
  if (engine === 'js') {
    const pkg = readFileSync(pkgFile, 'utf8')
    if (!NPM_PIN.test(pkg)) throw new Error(`${pkgFile} carries no carve-js pin to keep in step`)
    writeFileSync(pkgFile, pkg.replace(NPM_PIN, `$1${sha}$3`))
  }
  return pins[engine] === sha
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2)
  const flag = (name) => {
    const at = args.indexOf(name)
    return at === -1 ? null : args[at + 1]
  }
  const engine = flag('--engine') ?? 'js'
  const usage = () => {
    console.error('usage: set-engine-pin.mjs --current [--engine js|php|rb|rs]')
    console.error('       set-engine-pin.mjs --set <40-character sha> [--engine js|php|rb|rs]')
    console.error('       set-engine-pin.mjs --github-output')
    process.exit(2)
  }

  try {
    if (args.includes('--github-output')) {
      const pins = enginePins()
      process.stdout.write(ENGINES.map((name) => `${name}=${pins[name]}`).join('\n') + '\n')
    } else if (args.includes('--current')) {
      if (!ENGINES.includes(engine)) usage()
      console.log(enginePins()[engine])
    } else if (args.includes('--set')) {
      const sha = flag('--set')
      if (!ENGINES.includes(engine) || !/^[0-9a-f]{40}$/.test(sha ?? '')) usage()
      const unchanged = setPin(engine, sha)
      console.log(`carve-${engine} ${unchanged ? 'pin already at' : 'pin set to'} ${sha.slice(0, 8)}`)
    } else {
      usage()
    }
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
