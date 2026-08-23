#!/usr/bin/env node
/*
 * WHO DEPENDS ON WHOM ACROSS THE ORG, AND WHETHER THE PIN IS A RELEASE.
 *
 * The wiki's Version Map answers "what shipped, where, when" for every taggable
 * repo, and it answers it well. It does not answer the other question, because
 * the dependency edges live inside its prose: `Engine carve-rs a33c42ad`,
 * `requires carve-php ^0.1.5`. A sentence is a snapshot of the moment someone
 * wrote it, so a pin that goes stale reads exactly like one that did not - and
 * the map cannot be re-derived to find out.
 *
 * That gap is not hypothetical. obsidian-carve bundles carve-js into its
 * released `main.js` from a commit 91 past the 0.1.4 tag, so the plugin ships a
 * build no release ever named, and the repo has no row on the map at all.
 *
 * So this reads the manifests instead of the prose. For every non-archived repo
 * in the org it finds each dependency on another org repo, resolves what the
 * pin actually points at, and says whether that is a released tag and how far
 * behind the target has moved since.
 *
 * IT REPORTS AND DOES NOT FAIL. Several repos pin an unreleased commit on
 * purpose - a binding tracking an engine fix that has not been tagged, a
 * satellite waiting on a coordinated minor - and a gate that reddened those
 * would be turned off within a week. The value is the diff between two runs.
 *
 * WHY EVERY PIN SPELLING IS PARSED, not the ones a grep would find. Searching
 * the org for `git+https://github.com/markup-carve` returns sixteen repos and
 * misses obsidian-carve, which uses npm's `github:owner/repo#ref` shorthand.
 * That is the same hole carve-grammars' own publish guard was rewritten to
 * close (markup-carve/carve-grammars#293): a check that cannot see two thirds
 * of its subject reports clean, and the repo is clean by luck. The spellings
 * below are that guard's acceptance table plus the ones only a lockfile or a
 * submodule uses.
 *
 * Usage:
 *   node tools/dependency-map.mjs                 # Markdown to stdout
 *   node tools/dependency-map.mjs --json          # the same data, unrendered
 *   node tools/dependency-map.mjs --out FILE      # write instead of printing
 *   node tools/dependency-map.mjs --org NAME      # default markup-carve
 *
 * Needs `gh` authenticated. Roughly one request per repo plus a few per
 * dependency target; well inside the authenticated hourly limit.
 */

import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { promisify } from 'node:util'

const run = promisify(execFile)

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name, fallback) => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}

const ORG = value('org', 'markup-carve')
const CONCURRENCY = 6

/** `gh api` as JSON, with 404 as a value rather than a throw. */
async function api(path, { raw = false } = {}) {
  try {
    const { stdout } = await run('gh', ['api', path, ...(raw ? ['--header', 'Accept: application/vnd.github.raw'] : [])], {
      maxBuffer: 64 * 1024 * 1024,
    })
    return raw ? stdout : JSON.parse(stdout)
  } catch (error) {
    const message = String(error.stderr ?? error.message ?? '')
    if (message.includes('Not Found') || message.includes('404')) return null
    throw error
  }
}

/** Map over items with a bounded number in flight. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

// ---------------------------------------------------------------------------
// Reading a repository
// ---------------------------------------------------------------------------

/** Manifests worth opening, keyed by the parser that understands them. */
const MANIFESTS = new Map([
  ['package.json', 'npm'],
  ['composer.json', 'composer'],
  ['Cargo.toml', 'cargo'],
  ['pyproject.toml', 'python'],
  ['.gitmodules', 'submodule'],
  ['extension.toml', 'zed'],
  ['Cargo.lock', 'cargolock'],
  ['Gemfile', 'ruby'],
])

/** One request per repo: the whole tree, so only manifests that exist are read. */
async function repoManifestPaths(repo, branch) {
  const tree = await api(`repos/${ORG}/${repo}/git/trees/${branch}?recursive=1`)
  if (!tree?.tree) return { manifests: [], gitlinks: new Map() }
  const wanted = []
  // A SUBMODULE'S PIN IS THE GITLINK, NOT `.gitmodules`. That file carries the
  // url and the path and no commit at all, so reading it alone reports every
  // submodule as tracking a branch - which is the opposite of what a gitlink
  // is. The tree entry of type `commit` is the pinned sha, and this is the one
  // request that already has it.
  const gitlinks = new Map()
  for (const entry of tree.tree) {
    if (entry.type === 'commit') gitlinks.set(entry.path, entry.sha)
    if (entry.type !== 'blob') continue
    // Only root manifests and one level down: a fixture deep in tests/ is not
    // a dependency this repo ships, and reading them all turns a cheap report
    // into a slow one.
    // Three deep, not two: a Ruby or Python binding keeps its engine pin in
    // `ext/<name>/Cargo.lock`, which a two-level walk cannot see - and that
    // file IS the pin for the whole gem.
    const depth = entry.path.split('/').length
    if (depth > 3) continue
    const base = entry.path.split('/').pop()
    if (MANIFESTS.has(base)) wanted.push({ path: entry.path, kind: MANIFESTS.get(base) })
    else if (base.endsWith('.gemspec') || base.endsWith('.rockspec')) {
      wanted.push({ path: entry.path, kind: 'ruby' })
    }
  }
  return { manifests: wanted, gitlinks }
}

async function readFile(repo, path, branch) {
  return api(`repos/${ORG}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, { raw: true })
}

// ---------------------------------------------------------------------------
// Recognizing an edge
// ---------------------------------------------------------------------------

/**
 * Which org repo a dependency spec points at, and how it is pinned.
 *
 * Returns null for a spec that names no org repo. The `kind` is what decides
 * whether the pin can be checked against a release at all:
 *
 *   registry  a version or range resolved by npm/Packagist/crates/PyPI
 *   git       a repository URL or shorthand, with or without a ref
 *   submodule a gitlink, always an exact commit
 *   path      a local checkout, which pins nothing
 */
function classify(name, spec) {
  const text = String(spec ?? '')

  // A local path pins nothing and is normal in a monorepo-ish checkout.
  if (/^(file:|link:|\.{1,2}\/)/.test(text)) return { kind: 'path', ref: null, target: null }

  // Every git spelling, including the two a prefix filter misses: npm's bare
  // `owner/repo#ref` shorthand, which carries no protocol, and `npm:` aliases,
  // which look like one and are not.
  const git =
    text.match(/github(?:\.com)?[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:#(.+))?$/i) ??
    text.match(/^(?:github:)?([\w.-]+)\/([\w.-]+?)(?:#(.+))?$/)
  if (git && !text.startsWith('npm:')) {
    const [, owner, repo, ref] = git
    if (owner.toLowerCase() !== ORG.toLowerCase()) return null
    return { kind: 'git', ref: ref ?? null, target: repo }
  }

  // A registry name: the package is not the repo, so the caller maps it.
  const target = PACKAGE_TO_REPO.get(name)
  if (!target) return null
  return { kind: 'registry', ref: text || null, target }
}

/**
 * Registry package to org repo.
 *
 * Hand-kept, and it has to be: crates.io took `carve`, so the Rust engine
 * publishes as `carve-lang` while its binary stays `carve`, and PyPI's
 * `carve-lang` is the Python binding over that engine rather than the engine.
 * Nothing in a manifest carries the mapping, so guessing from the name would
 * put two different repos in the same row.
 */
const PACKAGE_TO_REPO = new Map([
  ['@markup-carve/carve', 'carve-js'],
  ['@markup-carve/carve-wasm', 'carve-wasm'],
  ['@markup-carve/carve-grammars', 'carve-grammars'],
  ['@markup-carve/carve-lsp', 'carve-lsp'],
  ['@markup-carve/carve-components', 'carve-components'],
  ['@markup-carve/carve-press', 'carve-press'],
  ['@markup-carve/carve-wysiwyg', 'carve-wysiwyg'],
  ['markup-carve/carve-php', 'carve-php'],
  ['markup-carve/laravel-carve', 'laravel-carve'],
  ['markup-carve/symfony-carve', 'symfony-carve'],
  ['markup-carve/carve-php-media-embed', 'carve-php-media-embed'],
  ['carve-lang', 'carve-rs'], // crates.io: the Rust engine
  ['mkdocs-carve', 'mkdocs-carve'],
])

/**
 * PyPI and RubyGems also ship `carve-lang`, and it is NOT the Rust crate - it
 * is the binding repo that wraps it. The manifest's language decides which.
 */
const PACKAGE_TO_REPO_BY_ECOSYSTEM = new Map([
  ['python:carve-lang', 'carve-py'],
  ['ruby:carve-lang', 'carve-rb'],
])

function targetFor(ecosystem, name, spec) {
  const override = PACKAGE_TO_REPO_BY_ECOSYSTEM.get(`${ecosystem}:${name}`)
  const found = classify(name, spec)
  if (!found) return null
  if (override && found.kind === 'registry') return { ...found, target: override }
  return found
}

const EDGE_FIELDS = {
  npm: ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'],
  composer: ['require', 'require-dev'],
}

function parseManifest(kind, path, text, gitlinks) {
  const edges = []
  const push = (name, spec, field) => {
    const ecosystem = kind === 'python' ? 'python' : kind === 'ruby' ? 'ruby' : kind
    const found = targetFor(ecosystem, name, spec)
    if (found?.target) edges.push({ ...found, name, spec: String(spec ?? ''), field, path })
  }

  if (kind === 'npm' || kind === 'composer') {
    let json
    try {
      json = JSON.parse(text)
    } catch {
      return edges
    }
    for (const field of EDGE_FIELDS[kind]) {
      for (const [name, spec] of Object.entries(json[field] ?? {})) push(name, spec, field)
    }
    return edges
  }

  if (kind === 'cargo') {
    // Enough TOML for a dependency table: `name = "1.2"` and
    // `name = { git = "...", rev = "..." }`, in any [dependencies] section.
    let inDeps = false
    for (const line of text.split('\n')) {
      const section = line.match(/^\s*\[([^\]]+)\]/)
      if (section) {
        inDeps = /(^|\.)(dependencies|dev-dependencies|build-dependencies)$/.test(section[1])
        continue
      }
      if (!inDeps) continue
      const entry = line.match(/^\s*([\w-]+)\s*=\s*(.+?)\s*$/)
      if (!entry) continue
      const [, name, raw] = entry
      const git = raw.match(/git\s*=\s*"([^"]+)"/)
      const rev = raw.match(/rev\s*=\s*"([^"]+)"/)
      const renamed = raw.match(/package\s*=\s*"([^"]+)"/)
      // AN INLINE TABLE IS NOT A VERSION. `carve_rs = { package = "carve-lang",
      // version = "=0.1.3" }` is a registry pin wearing a rename, and taking
      // the raw value made the whole table the spec - which reported a
      // pinned-to-a-release dependency as an unresolvable range, and put a
      // quoted brace into the graph label.
      const version = raw.match(/version\s*=\s*"([^"]+)"/)
      const spec = git
        ? `${git[1]}${rev ? `#${rev[1]}` : ''}`
        : (version?.[1] ?? raw.replace(/^\s*"|"\s*$/g, ''))
      push(renamed?.[1] ?? name, spec, 'dependencies')
    }
    return edges
  }

  if (kind === 'python') {
    // `dependencies = [...]` and every `[project.optional-dependencies]` list.
    for (const match of text.matchAll(/"([A-Za-z0-9._-]+)\s*([^"]*)"/g)) {
      const [, name, constraint] = match
      if (!name.includes('carve')) continue
      push(name, constraint.trim() || '*', 'dependencies')
    }
    return edges
  }

  if (kind === 'submodule') {
    // Block by block, so a url is paired with the path whose gitlink pins it.
    for (const block of text.split(/^\s*\[submodule /m).slice(1)) {
      const url = block.match(/url\s*=\s*(\S+)/)?.[1]
      const at = block.match(/path\s*=\s*(\S+)/)?.[1]
      if (!url) continue
      const found = classify('(submodule)', url)
      if (!found?.target) continue
      edges.push({
        ...found,
        kind: 'submodule',
        ref: gitlinks?.get(at) ?? null,
        name: at ?? '(submodule)',
        spec: url,
        field: 'submodule',
        path,
      })
    }
    return edges
  }

  if (kind === 'cargolock') {
    // `[[package]]` blocks, and only the ones whose source is a git url: a
    // registry entry here restates what Cargo.toml already declared.
    for (const block of text.split(/^\[\[package\]\]/m).slice(1)) {
      const name = block.match(/name\s*=\s*"([^"]+)"/)?.[1]
      const source = block.match(/source\s*=\s*"([^"]+)"/)?.[1]
      if (!name || !source?.startsWith('git+')) continue
      push(name, source.replace(/^git\+/, '').replace(/\?[^#]*/, ''), 'lock')
    }
    return edges
  }

  if (kind === 'ruby') {
    // A gemspec or rockspec dependency line, either quoting style.
    for (const match of text.matchAll(/dependency[^\n]*?["']([\w-]+)["'](?:[^\n]*?["']([^"']+)["'])?/g)) {
      const [, name, constraint] = match
      if (!name.includes('carve')) continue
      push(name, constraint ?? '*', 'dependency')
    }
    for (const match of text.matchAll(/^\s*["']?([\w-]*carve[\w-]*)["']?\s*[>=~]{1,2}\s*["']?([\d.]+)/gm)) {
      push(match[1], match[2], 'dependency')
    }
    return edges
  }

  if (kind === 'zed') {
    for (const match of text.matchAll(/repository\s*=\s*"([^"]+)"/g)) push('(grammar)', match[1], 'grammar')
    return edges
  }

  return edges
}

// ---------------------------------------------------------------------------
// Resolving a pin against the target's releases
// ---------------------------------------------------------------------------

const targetCache = new Map()

/** Tags, latest release and head of the default branch, once per target. */
async function targetState(repo) {
  if (targetCache.has(repo)) return targetCache.get(repo)
  const promise = (async () => {
    const meta = await api(`repos/${ORG}/${repo}`)
    if (!meta) return null
    const [tags, release] = await Promise.all([
      api(`repos/${ORG}/${repo}/tags?per_page=100`),
      api(`repos/${ORG}/${repo}/releases/latest`),
    ])
    const bySha = new Map()
    for (const tag of tags ?? []) bySha.set(tag.commit.sha, tag.name)
    return {
      branch: meta.default_branch,
      head: null,
      tags: tags ?? [],
      tagBySha: bySha,
      latestTag: tags?.[0]?.name ?? null,
      latestRelease: release?.tag_name ?? null,
    }
  })()
  targetCache.set(repo, promise)
  return promise
}

/** How far apart two refs are, as GitHub counts it. */
async function distance(repo, base, head) {
  const compare = await api(`repos/${ORG}/${repo}/compare/${base}...${head}`)
  if (!compare) return null
  return { ahead: compare.ahead_by, behind: compare.behind_by, status: compare.status }
}

/**
 * The verdict for one edge.
 *
 * `released` is the question the Version Map cannot answer: does this pin name
 * something that was tagged, or a commit that only ever existed on a branch?
 */
async function resolveEdge(edge) {
  const state = await targetState(edge.target)
  if (!state) return { ...edge, verdict: 'unknown', note: 'target repo not readable' }

  if (edge.kind === 'path') {
    return { ...edge, verdict: 'local', note: 'local path, pins nothing' }
  }

  if (edge.kind === 'registry') {
    const exact = edge.spec.match(/^=?=?\s*v?(\d+\.\d+\.\d+)$/)
    const latest = state.latestRelease ?? state.latestTag
    if (!exact) {
      return {
        ...edge,
        verdict: 'range',
        resolved: edge.spec,
        latest,
        note: 'a range floats to whatever the registry serves',
      }
    }
    const pinned = exact[1]
    const behind = latest && !latest.replace(/^v/, '').startsWith(pinned)
    return {
      ...edge,
      verdict: behind ? 'behind-release' : 'released',
      resolved: pinned,
      latest,
      note: behind ? `latest release is ${latest}` : 'pinned at the latest release',
    }
  }

  // git or submodule: an exact commit, or a branch name that is not a pin.
  const ref = edge.ref
  if (!ref) {
    const note =
      edge.kind === 'submodule'
        ? 'submodule with no gitlink in the tree'
        : 'no ref: tracks the default branch'
    return { ...edge, verdict: 'unpinned', latest: state.latestRelease, note }
  }
  if (!/^[0-9a-f]{7,40}$/i.test(ref)) {
    const asTag = state.tags.find((tag) => tag.name === ref || tag.name === `v${ref}`)
    if (asTag) {
      return { ...edge, verdict: 'released', resolved: ref, latest: state.latestRelease, note: 'pinned to a tag' }
    }
    return { ...edge, verdict: 'unpinned', resolved: ref, latest: state.latestRelease, note: `tracks "${ref}"` }
  }

  const tagName = state.tagBySha.get(ref) ?? [...state.tagBySha].find(([sha]) => sha.startsWith(ref))?.[1] ?? null
  const behindBranch = await distance(edge.target, ref, state.branch)
  const latest = state.latestRelease ?? state.latestTag
  const pastTag = latest ? await distance(edge.target, latest, ref) : null

  if (tagName) {
    return {
      ...edge,
      verdict: tagName === latest ? 'released' : 'behind-release',
      resolved: tagName,
      latest,
      behind: behindBranch?.ahead ?? null,
      note: tagName === latest ? 'the tag itself' : `the ${tagName} tag; latest is ${latest}`,
    }
  }

  // WHICH SIDE OF THE TAG. `ahead_by` alone reads as "0 commits past 0.1.4" for
  // a commit that is BEHIND the tag as well as for the tag itself, and those
  // are opposite facts about a pin. The compare's own `behind_by` tells them
  // apart, so a pin older than the last release says so.
  const relation = latest
    ? pastTag?.ahead
      ? `${pastTag.ahead} past ${latest}`
      : pastTag?.behind
        ? `${pastTag.behind} BEHIND ${latest}`
        : `level with ${latest}`
    : 'no release to compare against'

  return {
    ...edge,
    verdict: 'unreleased',
    resolved: ref.slice(0, 8),
    latest,
    behind: behindBranch?.ahead ?? null,
    note: `${relation}, ${behindBranch?.ahead ?? '?'} behind ${state.branch}`,
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const VERDICTS = {
  released: { label: '✅ released', rank: 0 },
  'behind-release': { label: '🟡 older release', rank: 2 },
  range: { label: '🟦 range', rank: 1 },
  unreleased: { label: '🔴 not a release', rank: 4 },
  unpinned: { label: '🟠 unpinned', rank: 3 },
  local: { label: '⬚ local', rank: 1 },
  unknown: { label: '❔ unknown', rank: 1 },
}

const MERMAID_CLASS = {
  released: 'ok',
  'behind-release': 'old',
  range: 'range',
  unreleased: 'bad',
  unpinned: 'loose',
  local: 'range',
  unknown: 'range',
}

const nodeId = (name) => name.replace(/[^A-Za-z0-9]/g, '_')

/**
 * The layers, so the graph reads as a tree rather than a hairball.
 *
 * Almost every edge fans into six repos, so an unlayered `graph LR` puts the
 * spec next to a Vite plugin and the shape says nothing. These four names are
 * the ones the wiki's Version Map already groups by, and they change about
 * once a year; everything else lands in the outer ring by omission, so a new
 * repo needs no edit here to appear.
 */
const TIERS = [
  ['Spec', ['carve']],
  ['Engines', ['carve-js', 'carve-rs', 'carve-php']],
  ['Bindings', ['carve-py', 'carve-rb', 'carve-go', 'carve-wasm']],
  ['Shared libraries', ['carve-grammars', 'carve-lsp', 'carve-components']],
]

const TIER_MEMBERS = new Set(TIERS.flatMap(([, members]) => members))

/** A label Mermaid can hold: no node syntax, no edge syntax, not too long. */
function edgeLabel(edge) {
  const raw = String(edge.resolved ?? edge.ref ?? edge.spec ?? '?')
  const safe = raw.replace(/["'`|<>{}[\]()]/g, '').replace(/\s+/g, ' ').trim()
  return safe.length > 16 ? `${safe.slice(0, 15)}…` : safe || '?'
}

function classLines(painted) {
  return [
    '  classDef ok fill:#d7f5dd,stroke:#2a7d4f,color:#0b3d22',
    '  classDef old fill:#fdf3c8,stroke:#a07c17,color:#4a3a06',
    '  classDef range fill:#e6eefc,stroke:#3b6ea5,color:#12304f',
    '  classDef loose fill:#fde6cf,stroke:#a35d17,color:#4a2906',
    '  classDef bad fill:#fbdcdc,stroke:#a72020,color:#4a0d0d',
    ...[...painted].map(([node, { cls }]) => `  class ${node} ${cls}`),
  ]
}

/** Worst pin out of a node decides its colour, so one bad edge still reads red. */
function paint(painted, node, verdict) {
  const rank = VERDICTS[verdict].rank
  if (!painted.has(node) || painted.get(node).rank < rank) {
    painted.set(node, { rank, cls: MERMAID_CLASS[verdict] })
  }
}

/**
 * ARROWS POINT FROM A DEPENDENCY TO WHAT USES IT, which is backwards from how
 * the edge is declared and right for reading: the spec ends up on the left and
 * everything it feeds fans out to the right. Drawn the declared way, every
 * arrow converges on six nodes at the right-hand edge and the picture is a
 * funnel rather than a tree.
 */
function renderSpine(edges) {
  const spine = edges.filter((edge) => TIER_MEMBERS.has(edge.repo) && TIER_MEMBERS.has(edge.target))
  const lines = ['```mermaid', 'flowchart LR']
  const painted = new Map()
  const mentioned = new Set(spine.flatMap((edge) => [edge.repo, edge.target]))

  for (const [title, members] of TIERS) {
    const present = members.filter((name) => mentioned.has(name))
    if (!present.length) continue
    lines.push(`  subgraph ${nodeId(title)}["${title}"]`)
    for (const name of present) lines.push(`    ${nodeId(name)}["${name}"]`)
    lines.push('  end')
  }
  const seen = new Set()
  for (const edge of spine) {
    const key = `${edge.target}->${edge.repo}`
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(`  ${nodeId(edge.target)} -->|"${edgeLabel(edge)}"| ${nodeId(edge.repo)}`)
    paint(painted, nodeId(edge.repo), edge.verdict)
  }
  lines.push(...classLines(painted), '```')
  return lines.join('\n')
}

/** One fan per hub, so a consumer sits beside the thing it pins. */
function renderConsumers(edges) {
  const leaves = edges.filter((edge) => !TIER_MEMBERS.has(edge.repo) || !TIER_MEMBERS.has(edge.target))
  const byHub = new Map()
  for (const edge of leaves) {
    if (!byHub.has(edge.target)) byHub.set(edge.target, [])
    byHub.get(edge.target).push(edge)
  }
  const hubs = [...byHub.entries()].sort((a, b) => b[1].length - a[1].length)

  const lines = ['```mermaid', 'flowchart LR']
  const painted = new Map()
  for (const [hub, fan] of hubs) {
    lines.push(`  subgraph ${nodeId(`fan_${hub}`)}["uses ${hub}"]`)
    lines.push(`    ${nodeId(hub)}(["${hub}"])`)
    for (const edge of fan) lines.push(`    ${nodeId(`${hub}__${edge.repo}`)}["${edge.repo}"]`)
    lines.push('  end')
    for (const edge of fan) {
      const node = nodeId(`${hub}__${edge.repo}`)
      lines.push(`  ${nodeId(hub)} -->|"${edgeLabel(edge)}"| ${node}`)
      paint(painted, node, edge.verdict)
    }
  }
  lines.push(...classLines(painted), '```')
  return lines.join('\n')
}

/** Kept for the tests and for anyone wanting the whole thing in one picture. */
function renderMermaid(edges) {
  const lines = ['```mermaid', 'flowchart LR']
  const painted = new Map()
  const mentioned = new Set(edges.flatMap((edge) => [edge.repo, edge.target]))
  const tiered = new Set()
  for (const [title, members] of TIERS) {
    const present = members.filter((name) => mentioned.has(name))
    if (!present.length) continue
    lines.push(`  subgraph ${nodeId(title)}["${title}"]`)
    for (const name of present) {
      lines.push(`    ${nodeId(name)}["${name}"]`)
      tiered.add(name)
    }
    lines.push('  end')
  }
  for (const name of [...mentioned].sort()) {
    if (!tiered.has(name)) lines.push(`  ${nodeId(name)}["${name}"]`)
  }
  const seen = new Set()
  for (const edge of edges) {
    const key = `${edge.repo}->${edge.target}:${edgeLabel(edge)}`
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(`  ${nodeId(edge.repo)} -->|"${edgeLabel(edge)}"| ${nodeId(edge.target)}`)
    paint(painted, nodeId(edge.repo), edge.verdict)
  }
  lines.push(...classLines(painted), '```')
  return lines.join('\n')
}

function renderMarkdown(edges, { repos, skipped, generatedFrom }) {
  const worst = [...edges].sort(
    (a, b) => VERDICTS[b.verdict].rank - VERDICTS[a.verdict].rank || a.repo.localeCompare(b.repo),
  )
  const counts = new Map()
  for (const edge of edges) counts.set(edge.verdict, (counts.get(edge.verdict) ?? 0) + 1)

  const out = []
  out.push('# Dependency Map')
  out.push('')
  out.push(
    `Every dependency one \`${ORG}\` repo declares on another, read from the manifests rather than ` +
      'from prose, with what the pin actually resolves to.',
  )
  out.push('')
  out.push(
    '**Generated - do not edit by hand.** `node tools/dependency-map.mjs` in the `carve` repo. ' +
      'The narrative half of the ecosystem lives on [Home](Home), which is hand-written on purpose; ' +
      'this page is only the part a machine can re-derive.',
  )
  out.push('')
  out.push(`Read ${repos} repositories, ${edges.length} edges, from ${generatedFrom}.`)
  out.push('')
  out.push('## What the verdicts mean')
  out.push('')
  out.push('| | Meaning |')
  out.push('|---|---|')
  out.push('| ✅ released | The pin names a tag, and it is the latest release. |')
  out.push('| 🟡 older release | A real release, but not the newest one. Often deliberate. |')
  out.push('| 🟦 range | A registry range. Floats to whatever resolves at install time. |')
  out.push('| 🟠 unpinned | A branch name, or no ref at all. Whatever that branch says today. |')
  out.push('| 🔴 not a release | A commit that was never tagged. The build ships something no release names. |')
  out.push('| ⬚ local | A path dependency. Pins nothing, and is fine inside one checkout. |')
  out.push('')
  const summary = [...counts.entries()]
    .sort((a, b) => VERDICTS[b[0]].rank - VERDICTS[a[0]].rank)
    .map(([verdict, count]) => `${VERDICTS[verdict].label} ${count}`)
    .join(' · ')
  out.push(summary)
  out.push('')
  out.push('## The spine')
  out.push('')
  out.push(
    'Arrows point from a dependency to what uses it, so the spec is on the left and ' +
      'everything it feeds fans right. A node is painted by the worst pin pointing OUT of it.',
  )
  out.push('')
  out.push(renderSpine(edges))
  out.push('')
  out.push('## Everything else, one fan per hub')
  out.push('')
  out.push(
    'Nineteen repos pin carve-js and eleven pin the spec, so one picture of all of them is a ' +
      'funnel rather than a tree. Split by what they pin, each consumer sits beside it.',
  )
  out.push('')
  out.push(renderConsumers(edges))
  out.push('')
  out.push('## Every edge, worst first')
  out.push('')
  out.push('| Consumer | Depends on | Declared | Resolves to | Verdict | Note |')
  out.push('|---|---|---|---|---|---|')
  for (const edge of worst) {
    const declared = edge.spec.length > 46 ? `${edge.spec.slice(0, 43)}…` : edge.spec
    out.push(
      `| \`${edge.repo}\` | \`${edge.target}\` | \`${declared || edge.ref || '-'}\` | ` +
        `${edge.resolved ? `\`${edge.resolved}\`` : '-'} | ${VERDICTS[edge.verdict].label} | ${edge.note} |`,
    )
  }
  out.push('')
  if (skipped.length) {
    out.push('## No org dependency DECLARED')
    out.push('')
    out.push(
      'These declare nothing in a manifest. Several still depend on the org - a vendored ' +
        'grammar, an embedded wasm build, a copied query file - and that kind of dependency is ' +
        'invisible here by construction. Absence from the table above is not independence.',
    )
    out.push('')
    out.push(skipped.map((name) => `\`${name}\``).join(', '))
    out.push('')
  }
  return out.join('\n')
}

// ---------------------------------------------------------------------------

export { classify, parseManifest, renderMermaid, renderSpine, renderConsumers }

async function main() {
  const repos = await api(`orgs/${ORG}/repos?per_page=100&type=public`)
  const live = (repos ?? []).filter((repo) => !repo.archived && !repo.fork)

  const perRepo = await mapLimit(live, CONCURRENCY, async (repo) => {
    const { manifests, gitlinks } = await repoManifestPaths(repo.name, repo.default_branch)
    const found = []
    for (const manifest of manifests) {
      const text = await readFile(repo.name, manifest.path, repo.default_branch)
      if (!text) continue
      for (const edge of parseManifest(manifest.kind, manifest.path, text, gitlinks)) {
        // A repo depending on itself is a fixture or a self-reference, not an edge.
        if (edge.target === repo.name) continue
        found.push({ ...edge, repo: repo.name })
      }
    }
    return found
  })

  // ONE ROW PER PIN, NOT PER FILE. A Rust binding declares its engine in
  // `Cargo.toml` and again in `Cargo.lock`, and a lockfile restating the
  // manifest is the same pin twice - two rows would read as two dependencies
  // and double every count.
  const byPin = new Map()
  for (const edge of perRepo.flat()) {
    const key = `${edge.repo}|${edge.target}|${edge.ref ?? edge.spec}`
    const seen = byPin.get(key)
    if (seen) seen.paths.push(edge.path)
    else byPin.set(key, { ...edge, paths: [edge.path] })
  }
  const flat = [...byPin.values()]
  const resolved = await mapLimit(flat, CONCURRENCY, resolveEdge)
  const skipped = live.filter((repo) => !resolved.some((edge) => edge.repo === repo.name)).map((repo) => repo.name)

  if (flag('json')) {
    const text = `${JSON.stringify({ org: ORG, edges: resolved, skipped }, null, 2)}\n`
    const out = value('out', null)
    if (out) writeFileSync(out, text)
    else process.stdout.write(text)
    return
  }

  const markdown = `${renderMarkdown(resolved, {
    repos: live.length,
    skipped,
    generatedFrom: 'each repository\'s default branch',
  })}\n`
  const out = value('out', null)
  if (out) writeFileSync(out, markdown)
  else process.stdout.write(markdown)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
