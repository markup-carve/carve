#!/usr/bin/env node
/*
 * The Conformance page: per engine, how many conformance-pack cases its
 * RELEASED version renders differently from the spec model, read from the
 * engine's own drift ledger at the release tag and the pack at the spec commit
 * that tag pins. Engine CI fails on an undeclared or a stale ledger entry, so
 * the ledger count is the measured count at that commit.
 *
 *   node scripts/conformance-page.mjs --engine carve-js=../carve-js [--ref carve-js=0.1.16] [--out docs] [--date 2026-11-02]
 *
 * Writes docs/conformance.md and docs/public/badges/conformance-<engine>.json.
 * The engine checkouts need their tags; this checkout needs the pinned commit.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACK_DIR = 'resources/conformance-pack'

export const ENGINES = {
  'carve-js': { ledger: 'test/conformance-pack-drift.json', spec: 'spec' },
  'carve-php': { ledger: 'tests/fixtures/conformance-pack-drift.json', spec: 'tests/spec' },
  'carve-rs': { ledger: 'tests/fixtures/conformance-pack-drift.json', spec: 'tests/spec' },
}

const RELEASE_TAG = /^v?\d+\.\d+\.\d+$/

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

const show = (dir, rev, path) => git(dir, ['show', `${rev}:${path}`])

export function latestRelease(dir) {
  const tags = git(dir, ['for-each-ref', '--sort=-v:refname', '--format=%(refname:short)', 'refs/tags']) ?? ''
  return tags.split('\n').find((tag) => RELEASE_TAG.test(tag)) ?? null
}

/** Declared case ids in a drift ledger, each once. */
export function ledgerCases(ledger) {
  return new Set((ledger?.entries ?? []).flatMap((entry) => entry.cases ?? []))
}

/** The pack at one spec commit: total and case ids, or null when that commit has no pack. */
export function readPack(specDir, commit) {
  const indexText = show(specDir, commit, `${PACK_DIR}/index.json`)
  if (indexText === null) return null
  const index = JSON.parse(indexText)
  const ids = new Set()
  for (const family of Object.values(index.families)) {
    for (const shard of family.shards) {
      for (const c of JSON.parse(show(specDir, commit, `${PACK_DIR}/${shard}`))) ids.add(c.id)
    }
  }
  return { total: index.total, ids }
}

/** Cases that differ: declared ledger ids the pack has. Ids the pack lacks are counted apart. */
export function measure(pack, ledger) {
  const declared = ledgerCases(ledger)
  const differ = [...declared].filter((id) => pack.ids.has(id)).length
  return { total: pack.total, differ, unknown: declared.size - differ }
}

export function rate(total, differ) {
  if (!total) return null
  const value = ((total - differ) / total) * 100
  // Never round a differing engine up to 100%.
  return differ > 0 && value >= 99.995 ? '99.99' : value.toFixed(2)
}

/** `0.1.13-0-g...` is the release itself; `0.1.13-536-g...` is a commit after it. */
export function specVersion(described) {
  const m = described?.match(/^(.+)-(\d+)-g[0-9a-f]+$/)
  if (!m) return null
  return m[2] === '0' ? m[1] : `${m[1]} + ${m[2]} commits`
}

export function measureEngine(name, dir, ref, specDir) {
  const spec = ENGINES[name]
  const row = { engine: name, version: ref, commit: null, date: null, specCommit: null, specVersion: null, total: null, differ: null, unknown: 0, ledgerUrl: null, reason: null }
  if (!ref) return { ...row, reason: 'no release tag found' }
  row.commit = git(dir, ['rev-parse', `${ref}^{commit}`])
  if (!row.commit) return { ...row, reason: `${ref} not found in the checkout` }
  // An annotated tag carries its own date; a lightweight tag or a branch has the commit's.
  row.date = git(dir, ['for-each-ref', '--format=%(creatordate:short)', `refs/tags/${ref}`]) || git(dir, ['log', '-1', '--format=%cs', row.commit])
  const pin = git(dir, ['ls-tree', row.commit, spec.spec])?.match(/^160000 commit ([0-9a-f]{40})\t/)
  if (!pin) return { ...row, reason: `no spec pin at ${spec.spec}` }
  row.specCommit = pin[1]
  row.specVersion = specVersion(git(specDir, ['describe', '--tags', '--long', '--match', '[0-9]*', row.specCommit]))
  if (git(specDir, ['cat-file', '-t', row.specCommit]) !== 'commit') {
    return { ...row, reason: 'the pinned spec commit is not in this checkout' }
  }
  const pack = readPack(specDir, row.specCommit)
  if (!pack) return { ...row, reason: 'the pinned spec predates the conformance pack' }
  const ledgerText = show(dir, row.commit, spec.ledger)
  if (ledgerText === null) return { ...row, reason: 'the release predates its conformance-pack drift ledger' }
  row.ledgerUrl = `https://github.com/markup-carve/${name}/blob/${row.commit}/${spec.ledger}`
  return { ...row, ...measure(pack, JSON.parse(ledgerText)) }
}

export function badge(row) {
  const pct = row.reason ? null : rate(row.total, row.differ)
  if (pct === null) return { schemaVersion: 1, label: 'conformance', message: 'not measured', color: 'lightgrey' }
  const n = Number(pct)
  const color = n === 100 ? 'brightgreen' : n >= 99.5 ? 'green' : n >= 99 ? 'yellowgreen' : n >= 95 ? 'yellow' : 'orange'
  return { schemaVersion: 1, label: 'conformance', message: `${pct}%`, color }
}

const short = (sha) => (sha ? sha.slice(0, 8) : '-')

export function renderPage(rows, date) {
  const line = (row) => {
    const engine = `[${row.engine}](https://github.com/markup-carve/${row.engine})`
    const version = row.version ? `${row.version} (\`${short(row.commit)}\`)` : '-'
    const spec = row.specCommit ? `${row.specVersion ?? '-'} (\`${short(row.specCommit)}\`)` : '-'
    if (row.reason) return `| ${engine} | ${version} | ${spec} | not measured: ${row.reason} | - | ${row.date ?? '-'} | - |`
    const differ = `${row.differ} of ${row.total.toLocaleString('en-US')}`
    return `| ${engine} | ${version} | ${spec} | ${differ} | ${rate(row.total, row.differ)}% | ${row.date} | [ledger](${row.ledgerUrl}) |`
  }
  const unknown = rows.filter((row) => row.unknown > 0)
  return `---
description: How closely each released Carve engine renders the conformance pack the way the spec model does.
---

<!-- Generated by scripts/conformance-page.mjs; do not edit. -->

# Conformance

Each released engine against the spec commit it pins. Checked daily against
the latest published release of each engine; last regenerated ${date}.

| Engine | Release | Spec it pins | Cases that differ | Matching | Tagged | Ledger |
|---|---|---|---|---|---|---|
${rows.map(line).join('\n')}
${unknown.length ? `\n${unknown.map((row) => `${row.engine} declares ${row.unknown} case id(s) the pinned pack does not have; they are not counted.`).join('\n')}\n` : ''}
## How this is measured

- **The pack.** \`resources/conformance-pack/\` in this repository holds about
  12,000 cases: corpus rows mutated from a fixed seed, in cause families (block
  ownership, lazy lines, footnotes, fences, \`+\`, inline pairing, word-boundary
  guards, combined tokens, attribute blocks, writer round trip). The expected
  output of each case is the HTML the spec model (\`scripts/spec/\`) gives for
  it. See [Development](./development#conformance-pack).
- **The comparison.** An engine's HTML, trimmed, must equal the expected HTML
  exactly. Round-trip cases render the engine's own \`fmt\` output of the
  source.
- **The count.** Every engine runs the pack in CI at its spec pin and must
  declare each differing case in its drift ledger, under the ticket for its
  cause. A differing case that is not declared, or a declared case that
  passes, fails the engine's CI. So the ledger at the release tag is the
  number of differing cases for that release, and the ledger link lists each
  one with its ticket.
- **What it does not measure.** Inputs outside the pack, AST output, lint and
  import paths. The pack grows from the corpus, so a cause no corpus row is
  near can stay unseen.
`
}

function parseArgs(argv) {
  const pairs = (key) => Object.fromEntries(argv.flatMap((arg, i) => (arg === `--${key}` ? [argv[i + 1].split('=')] : [])))
  const value = (key) => {
    const i = argv.indexOf(`--${key}`)
    return i === -1 ? undefined : argv[i + 1]
  }
  return { engines: pairs('engine'), refs: pairs('ref'), out: value('out'), date: value('date'), spec: value('spec') }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2))
  const specDir = resolve(args.spec ?? root)
  const out = resolve(args.out ?? join(root, 'docs'))
  const date = args.date ?? new Date().toISOString().slice(0, 10)
  const rows = Object.keys(ENGINES).map((name) => {
    const dir = resolve(args.engines[name] ?? join(root, '..', name))
    return measureEngine(name, dir, args.refs[name] ?? latestRelease(dir), specDir)
  })
  mkdirSync(join(out, 'public/badges'), { recursive: true })
  writeFileSync(join(out, 'conformance.md'), renderPage(rows, date))
  for (const row of rows) {
    writeFileSync(join(out, 'public/badges', `conformance-${row.engine}.json`), JSON.stringify(badge(row), null, 2) + '\n')
  }
  for (const row of rows) {
    console.log(`${row.engine} ${row.version ?? '-'}: ${row.reason ?? `${row.differ} of ${row.total} differ (${rate(row.total, row.differ)}%)`}`)
  }
}
