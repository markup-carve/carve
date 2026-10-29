#!/usr/bin/env node
/*
 * The conformance pack: deterministic mutants of corpus rows, grouped by cause
 * family, with the spec model's HTML as the expected output. Every engine runs
 * it in CI at its spec pin (docs/contributing/conformance-pack.md).
 *
 *   node scripts/conformance-pack.mjs --write          # regenerate resources/conformance-pack/
 *   node scripts/conformance-pack.mjs --check          # fail if the pack is not what the model gives
 *   node scripts/conformance-pack.mjs --select-seeds   # re-pick the seed rows (moves the whole pack)
 *
 * Seeds are a frozen list of corpus row names, so a new corpus row does not move
 * the pack; only a model change (or a deliberate re-pick) does.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FRAGMENTS, mutate, rng } from './lib/mutation-fuzz.mjs'
import { parse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packDir = join(root, 'resources/conformance-pack')
const corpusDir = join(root, 'tests/corpus')

export const PACK_VERSION = 1
const PACK_SEED = 20261029
const CASES_PER_FAMILY = 1200
const SEEDS_PER_FAMILY = 120
const MAX_SEED_LENGTH = 600
const MAX_CASE_LENGTH = 900
const MAX_SHARD_BYTES = 400_000

// `match` picks the seed rows; `fragments` widen the shared fragment set toward
// the family's tokens. `mode: 'roundtrip'` asks the engine to render its own
// `fmt` output of the source, not the source itself.
export const FAMILIES = {
  ownership: {
    title: 'Block ownership under rule A',
    match: /^ {0,3}(?:[-*+] |\d+\. |> |: |:: )[^\n]*\n(?: {2,}|> )\S/m,
    fragments: ['- x', '  - x', '    - x', '> x', '1. x', '   x', ':: t', ':  d', '  > x'],
  },
  lazy: {
    title: 'Lazy lines',
    match: /^ *(?:> |[-*] |\d+\. |: )[^\n]+\n[A-Za-z]/m,
    fragments: ['lazy', 'x y', '  lazy', '> lazy', ' lazy'],
  },
  notes: {
    title: 'Footnote bodies',
    match: /^ *(?:> )*\[\^[^\]\n]+\]:/m,
    fragments: ['[^n]: body', '[^n]', '    more', '  more', '[^m]: - x', '[^m]: > q'],
  },
  fences: {
    title: 'Fences',
    match: /^ *(?:> )*(?:[-*] )?(?:`{3,}|~{3,}|:{3,})/m,
    fragments: ['```', '````', '~~~', ':::', '::::', '::: note', '```x', '  ```', '> ```'],
  },
  plus: {
    title: 'The + continuation marker',
    match: /^ *(?:> )*\+ /m,
    fragments: ['+ x', '+ ', '> + x', '  + x', '+ ```', '+ > q'],
  },
  inline: {
    title: 'Inline delimiter pairing',
    match: /\{[*_/~=^,]|[*_~=/][^\s*_~=/][^\n]*[^\s*_~=/][*_~=/]/,
    fragments: ['/i/', '*b*', '_u_', '~s~', '=h=', '{*b*}', '{/i/}', '{^s^}', '{,s,}', '*', '/', '_', '{*', '*}'],
  },
  guards: {
    title: 'Word-boundary guards',
    match: /[\p{L}\p{N}][_/][\p{L}\p{N}]/u,
    fragments: ['a_b_c', 'x/y/z', 'snake_case', 'a/b', '_x_y', '/x/y', 'x_', '_x'],
  },
  combined: {
    title: 'Combined tokens',
    match: /\/\*|\*\//,
    fragments: ['/*', '*/', '/*x*/', '*/ /*', '{/*', '*/}', '/*x/', '*x*/'],
  },
  attributes: {
    title: 'Attribute blocks',
    match: /\{[.#][^}\n]*\}|\{[a-z]+=/,
    fragments: ['{.c}', '{#i}', '{k=v}', '{.a #b}', '{', '}', '{.c', 'x{.c}', '{k="v"}'],
  },
  roundtrip: {
    title: 'Writer round trip',
    mode: 'roundtrip',
    match: /\S/,
    fragments: [],
  },
}

const option = (key) => process.argv.includes(`--${key}`)

const seedNumber = (family) => (PACK_SEED ^ Number.parseInt(createHash('sha256').update(family).digest('hex').slice(0, 8), 16)) >>> 0

export const caseId = (family, source) => `${family}-${createHash('sha256').update(source).digest('hex').slice(0, 12)}`

function renderModel(source) {
  try {
    return { html: renderDoc(parse(source)).trim() }
  } catch (e) {
    return { refused: Boolean(e?.refuse), error: String(e?.message ?? e) }
  }
}

function selectSeeds() {
  const rows = readdirSync(corpusDir)
    .filter((name) => name.endsWith('.crv'))
    .sort()
    .map((name) => ({ name, source: readFileSync(join(corpusDir, name), 'utf8') }))
    .filter((row) => row.source.trim() && row.source.length <= MAX_SEED_LENGTH)
    .filter((row) => renderModel(row.source).html !== undefined)
  const seeds = {}
  for (const [family, spec] of Object.entries(FAMILIES)) {
    const matching = rows.filter((row) => spec.match.test(row.source)).map((row) => row.name)
    const step = Math.max(1, matching.length / SEEDS_PER_FAMILY)
    seeds[family] = [...new Set(Array.from({ length: Math.min(SEEDS_PER_FAMILY, matching.length) }, (_, i) => matching[Math.floor(i * step)]))]
  }
  return seeds
}

function generateFamily(family, spec, seedNames) {
  const seeds = seedNames.map((name) => readFileSync(join(corpusDir, name), 'utf8'))
  const fragments = [...FRAGMENTS, ...spec.fragments]
  const r = rng(seedNumber(family))
  const seen = new Set(seeds)
  const cases = []
  const skipped = { refused: 0, error: 0 }
  for (let attempts = 0; cases.length < CASES_PER_FAMILY && attempts < CASES_PER_FAMILY * 20; attempts++) {
    const { source } = mutate(r.pick(seeds), r, seeds, fragments)
    if (seen.has(source) || source.length > MAX_CASE_LENGTH || !source.trim()) continue
    seen.add(source)
    const out = renderModel(source)
    if (out.html === undefined) {
      skipped[out.refused ? 'refused' : 'error'] += 1
      continue
    }
    cases.push({ id: caseId(family, source), source, html: out.html })
  }
  cases.sort((a, b) => a.id.localeCompare(b.id))
  return { cases, skipped }
}

const shardText = (cases) => '[\n' + cases.map((c) => JSON.stringify(c)).join(',\n') + '\n]\n'

/** The pack as `{ file: text }`, built from the model in this checkout. */
export function buildPack(seeds) {
  const files = {}
  const families = {}
  for (const [family, spec] of Object.entries(FAMILIES)) {
    const { cases, skipped } = generateFamily(family, spec, seeds[family] ?? [])
    const shards = []
    let current = []
    let bytes = 0
    for (const c of cases) {
      const size = Buffer.byteLength(JSON.stringify(c), 'utf8') + 2
      if (current.length && bytes + size > MAX_SHARD_BYTES) {
        shards.push(current)
        current = []
        bytes = 0
      }
      current.push(c)
      bytes += size
    }
    if (current.length) shards.push(current)
    const names = shards.map((_, i) => `${family}-${String(i + 1).padStart(2, '0')}.json`)
    shards.forEach((shard, i) => { files[names[i]] = shardText(shard) })
    families[family] = { title: spec.title, mode: spec.mode ?? 'render', seeds: (seeds[family] ?? []).length, cases: cases.length, skipped, shards: names }
  }
  const total = Object.values(families).reduce((n, f) => n + f.cases, 0)
  files['index.json'] = JSON.stringify({
    comment: 'Generated by scripts/conformance-pack.mjs from the spec model; do not edit. Regenerate with `npm run pack:write`.',
    version: PACK_VERSION,
    seed: PACK_SEED,
    total,
    compare: 'engine HTML, trimmed, must equal `html` exactly; mode roundtrip renders the engine\'s fmt output of `source`',
    families,
  }, null, 2) + '\n'
  return files
}

const seedsPath = join(packDir, 'seeds.json')
const readSeeds = () => JSON.parse(readFileSync(seedsPath, 'utf8')).families

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (option('select-seeds')) {
    mkdirSync(packDir, { recursive: true })
    writeFileSync(seedsPath, JSON.stringify({ comment: 'Corpus rows the conformance pack mutates, per family. Written by `node scripts/conformance-pack.mjs --select-seeds`.', families: selectSeeds() }, null, 2) + '\n')
    console.log(`conformance-pack: wrote ${seedsPath}`)
  }
  if (!existsSync(seedsPath)) {
    console.error('conformance-pack: no seeds.json; run with --select-seeds first')
    process.exit(2)
  }
  const started = Date.now()
  const files = buildPack(readSeeds())
  const index = JSON.parse(files['index.json'])
  if (option('write') || option('select-seeds')) {
    mkdirSync(packDir, { recursive: true })
    const stale = readdirSync(packDir).filter((f) => f.endsWith('.json') && f !== 'seeds.json' && !(f in files))
    if (stale.length) console.log(`conformance-pack: no longer generated, remove by hand: ${stale.join(', ')}`)
    for (const [name, text] of Object.entries(files)) writeFileSync(join(packDir, name), text)
    console.log(`conformance-pack: wrote ${index.total} cases in ${Object.keys(files).length - 1} shards (${Date.now() - started} ms)`)
  } else if (option('check')) {
    const wanted = new Set(Object.keys(files))
    const present = readdirSync(packDir).filter((f) => f.endsWith('.json') && f !== 'seeds.json')
    const problems = [
      ...Object.entries(files).filter(([name, text]) => !existsSync(join(packDir, name)) || readFileSync(join(packDir, name), 'utf8') !== text).map(([name]) => `${name} differs from the model`),
      ...present.filter((name) => !wanted.has(name)).map((name) => `${name} is no longer generated`),
    ]
    if (problems.length) {
      console.error(`conformance-pack: the pack is stale against the spec model:\n  ${problems.join('\n  ')}\nRegenerate with \`npm run pack:write\` and commit resources/conformance-pack/.`)
      process.exit(1)
    }
    console.log(`conformance-pack: ${index.total} cases current (${Date.now() - started} ms)`)
  } else {
    console.error('conformance-pack: pass --write, --check or --select-seeds')
    process.exit(2)
  }
}
