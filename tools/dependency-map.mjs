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
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

/** This file lives in tools/, so the repo root is one level up. */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
  const workflows = []
  const vendored = []
  for (const entry of tree.tree) {
    if (entry.type === 'commit') gitlinks.set(entry.path, entry.sha)
    if (entry.type !== 'blob') continue
    // CI is where an UNDECLARED dependency becomes readable. A repo that
    // vendors a grammar or embeds an engine build usually also checks that
    // repo out to test the copy is current, and that checkout names it.
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.path)) workflows.push(entry.path)
    // A COMMITTED BUILD OF ANOTHER REPO. The build scripts that produce these
    // stamp a provenance header, so the pin is IN the artifact rather than in a
    // manifest - which is why a manifest reader calls the repo independent
    // while it ships a megabyte of an engine. Candidates by extension only;
    // the header read below is what decides.
    if (VENDOR_CANDIDATE.test(entry.path)) vendored.push(entry.path)
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
  return { manifests: wanted, gitlinks, workflows, vendored }
}

/*
 * DEPENDENCIES NOTHING DECLARES, READ OUT OF CI.
 *
 * Thirteen repos declare no manifest dependency on the org, and the page used
 * to render that as "no org dependency" with a paragraph admitting that a
 * vendored grammar or an embedded engine build is invisible here. That
 * paragraph was right and it was also the end of the enquiry.
 *
 * Most of those repos DO name what they depend on - in a workflow rather than
 * in a manifest, because the dependency is a copy that has to be checked
 * against its source. `helix-carve` checks out `tree-sitter-carve` in a job
 * called grammar-drift; `carve-go` checks out `carve-rs` to rebuild the WASI
 * engine it embeds. That is a real dependency and a machine can read it.
 *
 * IT IS A WEAKER CLAIM THAN A MANIFEST EDGE and is kept separate for that
 * reason: a manifest pin says "this build contains that version", a workflow
 * checkout says "this repo is tested against that repo". The first constrains
 * release order absolutely; the second says the two are coupled and a release
 * wants looking at. So these never override a declared edge, and the tree
 * marks them.
 *
 * WHAT IT STILL CANNOT SEE: a vendored file with no CI check on it. emacs-carve
 * vendors carve-grammars' block-battery table and says so in a comment, in
 * prose, which is not a contract. Absence here remains weaker evidence than
 * presence.
 */
/*
 * Extensions a committed build of another repo actually uses. Deliberately
 * narrow: this list decides which files get a header read, and widening it to
 * "every .json" would spend a request per fixture in the org.
 */
const VENDOR_CANDIDATE = /\.(iife\.js|bundle\.js|min\.js|umd\.js|wasm|css)$|\/(server|engine|carve)\.js$/

/*
 * THE PIN THAT LIVES IN THE ARTIFACT.
 *
 * `tools/build-carve-bundle.sh` in intellij-carve writes
 *
 *   // Bundled from markup-carve/carve-js commit 37ed8904…
 *
 * and its own test reads it back, precisely because a recorded provenance that
 * nothing consumes "looks like traceability and cannot fail" - the dead-check
 * shape catalogued in markup-carve/carve#755. This is the org-wide consumer of
 * the same line: a repo that ships a build of another repo is not independent
 * of it, whatever its manifests say, and here that dependency has a resolvable
 * commit rather than a guess.
 *
 * Only the first bytes are read. A range request over raw content turns a 1.4MB
 * bundle into 300 bytes, so this is cheap enough to run over every candidate.
 */
const VENDOR_HEADER = /(?:Bundled|Generated|Vendored|Copied)\s+from\s+markup-carve\/([a-z0-9][a-z0-9.-]*)/i

/*
 * THE COMMIT IS NOT ALWAYS ON THE SAME LINE as the repo it names, and requiring
 * that quietly downgraded a real pin to "unpinned". intellij-carve's CSS header
 * reads
 *
 *   VENDORED from markup-carve/carve-css src/recipes.css
 *   version 0.1.0, commit e0042b9
 *
 * which a same-line pattern reports as a dependency with no version - true of
 * the line it looked at and false of the file. The whole header window is
 * searched instead, which is the unit the writer was working in.
 */
const VENDOR_COMMIT = /\bcommit\s+([0-9a-f]{7,40})\b/i

function vendorProvenance(head, self, known) {
  const match = VENDOR_HEADER.exec(head)
  if (!match) return null
  const target = match[1].replace(/\.git$/, '')
  if (target === self || !known.has(target)) return null
  return { target, ref: VENDOR_COMMIT.exec(head)?.[1] ?? null }
}

/*
 * THE HAND-WRITTEN HALF, AND WHY IT IS GATED HARDER THAN THE READ HALF.
 *
 * resources/undeclared-dependencies.txt holds the edges no manifest, bundle
 * header or checkout can be read for, and the edges the tool finds that are not
 * dependencies at all. Its own file comment carries the rules; this parses it.
 *
 * A hand-written note about a hand-written dependency rots the same way the
 * wiki prose did, so parsing is strict and the caller checks both directions: a
 * line the tool can now find on its own is STALE and must go, a line naming a
 * repo or kind that does not exist is an error. The file can only hold what
 * detection cannot reach.
 */
const DECLARED_KINDS = new Set(['vendors', 'couples', 'not-a-dependency'])

function parseDeclaredDependencies(text) {
  const rows = []
  const problems = []
  const seen = new Set()
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const match = /^(\S+)\s*->\s*(\S+)\s\s+(\S+)\s\s+(.+?)\s*$/.exec(line)
    if (!match) {
      problems.push(`line ${i + 1}: not "<repo> -> <target>  <kind>  <reason>"`)
      continue
    }
    const [, repo, target, kind, reason] = match
    if (!DECLARED_KINDS.has(kind)) {
      problems.push(`line ${i + 1}: unknown kind "${kind}" (${[...DECLARED_KINDS].join(', ')})`)
      continue
    }
    if (repo === target) {
      problems.push(`line ${i + 1}: ${repo} cannot depend on itself`)
      continue
    }
    const key = `${repo}|${target}`
    if (seen.has(key)) {
      problems.push(`line ${i + 1}: ${repo} -> ${target} is declared twice`)
      continue
    }
    seen.add(key)
    rows.push({ repo, target, kind, reason, line: i + 1 })
  }
  return { rows, problems }
}

/*
 * The two-directional check. `found` is what the run detected on its own.
 *
 * A declared line the run now finds is the good failure: someone taught the
 * tool to read that dependency and the note is redundant. It is reported rather
 * than tolerated, because a ledger nobody prunes becomes the prose again.
 */
function auditDeclared(rows, found, known) {
  const problems = []
  const detected = new Set(found.map((edge) => `${edge.repo}|${edge.target}`))
  for (const row of rows) {
    for (const name of [row.repo, row.target]) {
      if (!known.has(name)) problems.push(`line ${row.line}: no such repo "${name}"`)
    }
    const isDetected = detected.has(`${row.repo}|${row.target}`)
    if (row.kind === 'not-a-dependency' && !isDetected) {
      problems.push(
        `line ${row.line}: ${row.repo} -> ${row.target} suppresses an edge nothing detects any more - delete the line`,
      )
    }
    if (row.kind !== 'not-a-dependency' && isDetected) {
      problems.push(
        `line ${row.line}: ${row.repo} -> ${row.target} is detected on its own now - delete the line`,
      )
    }
  }
  return problems
}

function ciReferences(text, self, known) {
  const found = new Set()
  // ONLY A CHECKOUT, NOT A MENTION. `markup-carve/x` appearing anywhere in a
  // workflow says nothing about direction: carve-grammars names six consumers
  // in a downstream-check job and depends on none of them, carve-rs names the
  // homebrew tap it PUSHES to, and a first cut of this reported all of it as
  // dependencies - backwards, and confidently.
  //
  // `repository:` is the checkout input, so it is the one spelling that means
  // "this run needs that repo's tree". Narrowing to it drops every one of those
  // false edges and keeps the ones that motivated the feature: helix-carve
  // checking out tree-sitter-carve to diff a vendored grammar, carve-go
  // checking out carve-rs to rebuild the engine it embeds.
  for (const match of text.matchAll(/^\s*repository:\s*['"]?markup-carve\/([a-z0-9][a-z0-9.-]*)/gim)) {
    const name = match[1].replace(/\.git$/, '')
    if (name === self) continue
    // MATCHED AGAINST THE LIVE REPO LIST, because `markup-carve/` prefixes more
    // than repositories. carve-wasm's preflight explains the npm registry path
    // `/-/org/markup-carve/package` in a comment, and a pattern that only knows
    // the shape reported a repo named `package` that does not exist - as an
    // edge, with a verdict, in a table whose whole value is that its rows are
    // real. The org's own repo list is already in hand, so the check is free.
    if (!known.has(name)) continue
    found.add(name)
  }
  return found
}

async function readFile(repo, path, branch) {
  return api(`repos/${ORG}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, { raw: true })
}

/*
 * The first bytes of a file, without downloading it.
 *
 * The contents API returns the whole blob, and a vendored bundle is routinely
 * over a megabyte - fetching fifty of them to read three comment lines would
 * turn a cheap report into a slow one. Raw content honours a range request, so
 * this is 300 bytes per candidate. A server that ignores the range still
 * answers correctly, just wastefully, and the slice bounds it either way.
 */
async function readHead(repo, path, branch, bytes = 512) {
  const url = `https://raw.githubusercontent.com/${ORG}/${repo}/${branch}/${path}`
  try {
    const response = await fetch(url, { headers: { Range: `bytes=0-${bytes - 1}` } })
    if (!response.ok && response.status !== 206) return null
    return (await response.text()).slice(0, bytes)
  } catch {
    return null
  }
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
    const latestTag = tags?.[0]?.name ?? null
    const latestRelease = release?.tag_name ?? null
    // HOW FAR THIS REPO ITSELF HAS MOVED PAST ITS OWN LATEST TAG, which is a
    // different question from any edge verdict: an edge says whether a PIN
    // names a release, this says whether there is anything here to release at
    // all. Counts every commit, docs and CI included, so it reports that a
    // release is POSSIBLE rather than that one is warranted.
    const base = latestRelease ?? latestTag
    const own = base ? await distance(repo, base, meta.default_branch) : null
    return {
      branch: meta.default_branch,
      head: null,
      tags: tags ?? [],
      tagBySha: bySha,
      latestTag,
      latestRelease,
      behindTag: own?.ahead ?? null,
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

  // A VENDORED BUILD carries its own commit, so it resolves exactly like a git
  // pin - which is the point of reading it. Without a commit in the header the
  // artifact still names its source, and that is worth reporting as unpinned
  // rather than dropping.
  if (edge.kind === 'vendor') {
    if (!edge.ref) {
      return { ...edge, verdict: 'unpinned', note: `vendored in ${edge.path}, header names no commit` }
    }
    const resolved = await distance(edge.target, edge.ref, state.branch)
    const tagged = state.tagBySha.get(edge.ref)
    const latest = state.latestRelease ?? state.latestTag
    const behind = resolved?.ahead ?? null
    const note = `vendored in ${edge.path}${
      latest ? `, ${(await distance(edge.target, latest, edge.ref))?.ahead ?? '?'} past ${latest}` : ''
    }${behind === null ? '' : `, ${behind} behind main`}`
    return {
      ...edge,
      resolved: edge.ref.slice(0, 8),
      verdict: tagged ? (tagged === latest ? 'released' : 'behind-release') : 'unreleased',
      note,
    }
  }

  // A HAND-DECLARED dependency pins nothing - that is why it had to be written
  // down. The reason carries the evidence a pin would otherwise have carried.
  if (edge.kind === 'vendor-declared') {
    return { ...edge, verdict: 'undeclared', note: `declared by hand: ${edge.declaredReason}` }
  }

  // A workflow checkout pins nothing by construction - it takes whatever the
  // default branch says at run time. The verdict is about the COUPLING being
  // undeclared, which is the finding; asking whether it names a release would
  // report every one of them red for a question they do not answer.
  if (edge.kind === 'ci') {
    return { ...edge, verdict: 'undeclared', note: `named in ${edge.path}, not in any manifest` }
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
  undeclared: { label: '🔗 undeclared', rank: 1 },
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

/*
 * Derived from TIERS rather than restated, so a tier edit cannot leave two
 * lists disagreeing about which repo is the spec and which are engines. The
 * release order below reads both: the spec is the one repo every layer is
 * measured from, and the engines are the hubs stage 2 is grouped by.
 */
const SPEC_REPO = TIERS[0][1][0]
const ENGINES = TIERS[1][1]

/*
 * REPOS THAT ARE NOT RELEASE ARTIFACTS AT ALL.
 *
 * A release order that lists them reads as thirteen repos waiting to ship when
 * several of them will never ship anything: `.github` is org metadata, an
 * awesome-list is a list, a demo exists to be deployed rather than depended on,
 * and a benchmark or fidelity harness is measurement. None of them has a
 * consumer, so none can block one.
 *
 * They are LISTED rather than dropped, because silently omitting a repo from a
 * page whose claim is org coverage is the same defect as dropping the
 * unconstrained tail was - the reader cannot tell an intentional omission from
 * a broken query.
 *
 * The suffix rule catches demos as they are added; the names are the ones no
 * rule describes.
 */
const NEVER_RELEASED = new Set(['.github', 'awesome-carve', 'carve-bench', 'pandoc-format-fidelity'])
const notARelease = (repo) => NEVER_RELEASED.has(repo) || repo.endsWith('-demo')

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

/*
 * THE RELEASE ORDER, WHICH IS THE QUESTION THE GRAPH ABOVE DOES NOT ANSWER.
 *
 * The mermaid pictures show every edge, which is what makes them accurate and
 * what makes them unreadable for the one thing a maintainer actually asks:
 * "what may I release, and what has to go first". Nineteen repos pin carve-js,
 * so the fan is a funnel, and a funnel does not tell you the order.
 *
 * This layers the same edge list topologically. A repo may be released once
 * everything it depends on has been; repos in one layer do not depend on each
 * other, so they carry no order between them.
 *
 * THE SPEC'S OWN devDependencies ARE DROPPED. `carve` dev-depends on carve-js
 * and carve-grammars to render its own corpus, and both submodule the spec
 * back. That is a cycle, and it is not a build dependency in either direction -
 * it is verification. Keeping it would make the graph unlayerable and would
 * assert something false: that the spec cannot be tagged before its own
 * consumers. Every other edge is a real build or vendor dependency.
 *
 * `behindTag` is per REPO, not per edge: how far a repo's own default branch
 * has moved past its own latest tag. The edge notes above answer "is this pin a
 * release"; this answers "is there anything here to release at all". They are
 * different questions and a repo can be red on one and clean on the other.
 */
function releaseLayers(edges, allRepos) {
  const dep = new Map()
  const soft = new Map()
  // EVERY repo, not only the ones an edge names. A repo that declares no org
  // dependency has no edge at all, so seeding this from `edges` would drop the
  // entire unconstrained tail - the editors, the standalone tools - from a
  // list whose whole claim is that it covers the org. They belong in stage 0.
  const nodes = new Set(allRepos.filter((repo) => !notARelease(repo)))
  for (const edge of edges) {
    if (notARelease(edge.repo) || notARelease(edge.target)) continue
    nodes.add(edge.repo)
    nodes.add(edge.target)
    if (edge.repo === edge.target) continue
    // The verification cycle, described above.
    if (edge.repo === SPEC_REPO && edge.field === 'devDependencies') continue
    // A CI checkout is coupling, not containment - it never decides an order a
    // declared edge did not already decide. Recorded so the tree can mark it,
    // and deliberately kept out of `dep` so it cannot invent a stage.
    //
    // A VENDORED BUILD IS NOT IN THIS BRANCH ON PURPOSE. It ships the target
    // inside itself, which is the same relationship an npm pin describes and a
    // stronger one than a lockfile: the bytes are in the tree. It layers.
    if (edge.kind === 'ci') {
      if (!soft.has(edge.repo)) soft.set(edge.repo, new Set())
      soft.get(edge.repo).add(edge.target)
      continue
    }
    if (!dep.has(edge.repo)) dep.set(edge.repo, new Set())
    dep.get(edge.repo).add(edge.target)
  }
  const layer = new Map()
  const level = (node, seen = new Set()) => {
    if (layer.has(node)) return layer.get(node)
    // A cycle we did not name above would otherwise recurse forever. Treat the
    // back edge as absent rather than throwing: a wrong layer is visible in the
    // output and a stack overflow is not.
    if (seen.has(node)) return 0
    const targets = [...(dep.get(node) ?? [])].filter((t) => nodes.has(t))
    const value = targets.length
      ? 1 + Math.max(...targets.map((t) => level(t, new Set([...seen, node]))))
      : 0
    layer.set(node, value)
    return value
  }
  for (const node of nodes) level(node)
  return { layer, dep, soft }
}

function renderReleaseOrder(edges, states, allRepos) {
  const { layer, dep, soft } = releaseLayers(edges, allRepos)
  const byLayer = new Map()
  for (const [node, value] of layer) {
    if (!byLayer.has(value)) byLayer.set(value, [])
    byLayer.get(value).push(node)
  }

  const describe = (repo) => {
    const state = states.get(repo)
    const version = state?.latestRelease ?? state?.latestTag ?? 'UNRELEASED'
    const lag = state?.behindTag ? `+${state.behindTag}` : ''
    return `${repo.padEnd(24)} ${version.padEnd(10)} ${lag}`.trimEnd()
  }
  // WHAT A REPO IS COUPLED TO, for a repo that is already IN a stage.
  //
  // This existed and was rendered only for the unconstrained tail, so a repo
  // with one declared edge and three CI ones showed the declared edge and
  // silently dropped the rest. intellij-carve was the case that exposed it: it
  // declares a spec submodule, so it landed in a stage, and its carve-js and
  // carve-lsp couplings - which the run had already found - were collected and
  // never printed.
  const coupling = (repo) => {
    const targets = [...(soft.get(repo) ?? [])].sort()
    return targets.length ? `  ~ ${targets.join(', ')}` : ''
  }
  const branch = (items, extra = () => '') =>
    items.map((repo, index) => {
      const stem = index === items.length - 1 ? '└──' : '├──'
      return `    ${stem} ${describe(repo)}${extra(repo)}${coupling(repo)}`
    })

  const lines = ['```text']
  const zero = (byLayer.get(0) ?? []).filter((repo) => repo !== SPEC_REPO).sort()

  lines.push(`STAGE 0  the spec - everything downstream verifies against it`)
  lines.push(`  ${describe(SPEC_REPO)}`)

  for (const value of [...byLayer.keys()].filter((v) => v > 0).sort((a, b) => a - b)) {
    const members = byLayer.get(value).sort()
    lines.push('')
    if (value === 1) {
      lines.push('STAGE 1  everything that pins only the spec')
      for (const repo of members) lines.push(`  ${describe(repo)}${coupling(repo)}`)
      continue
    }
    lines.push(`STAGE ${value}`)
    if (value !== 2) {
      for (const repo of members) {
        const targets = [...(dep.get(repo) ?? [])].sort().join(', ')
        lines.push(`  ${describe(repo)}${targets ? `  <- ${targets}` : ''}${coupling(repo)}`)
      }
      continue
    }
    {
      // Grouped by hub, because a flat list of twenty-one at this layer is the
      // same funnel the mermaid fan already is.
      const claimed = new Set()
      for (const hub of ENGINES) {
        const fan = members.filter((r) => !claimed.has(r) && (dep.get(r) ?? new Set()).has(hub)).sort()
        if (!fan.length) continue
        for (const repo of fan) claimed.add(repo)
        lines.push(`  from ${hub}`)
        lines.push(...branch(fan))
      }
      const rest = members.filter((r) => !claimed.has(r)).sort()
      if (rest.length) {
        lines.push('  several hubs')
        lines.push(...branch(rest, (repo) => `  <- ${[...(dep.get(repo) ?? [])].sort().join(', ')}`))
      }
    }
  }

  if (zero.length) {
    // Split the unconstrained tail by whether CI names anything. A repo that
    // tests itself against another repo is coupled to it even with nothing in
    // a manifest, and saying so is more useful than one flat list that implies
    // thirteen independent repos.
    const coupled = zero.filter((repo) => (soft.get(repo) ?? new Set()).size)
    const loose = zero.filter((repo) => !(soft.get(repo) ?? new Set()).size)
    if (coupled.length) {
      lines.push('')
      lines.push('NOTHING DECLARED, BUT CI NAMES ONE  coupling rather than containment')
      for (const repo of coupled) {
        const targets = [...soft.get(repo)].sort().join(', ')
        lines.push(`  ${describe(repo)}  ~ ${targets}`)
      }
    }
    if (loose.length) {
      lines.push('')
      lines.push('NOTHING FOUND EITHER WAY  release whenever, in any order')
      for (const repo of loose) lines.push(`  ${describe(repo)}`)
    }
  }
  const excluded = allRepos.filter(notARelease).sort()
  if (excluded.length) {
    lines.push('')
    lines.push('NOT A RELEASE ARTIFACT  listed so an omission cannot pass for a broken query')
    lines.push(`  ${excluded.join(', ')}`)
  }
  lines.push('```')
  return lines.join('\n')
}

function renderMarkdown(edges, { repos, skipped, generatedFrom, states }) {
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
  out.push('## Release order')
  out.push('')
  out.push(
    'The graphs further down show every edge, which is what makes them complete and what makes ' +
      'them hard to read as an ORDER. This is the same data layered: a repo may be released once ' +
      'everything it depends on has been.',
  )
  out.push('')
  out.push(
    'Within a stage there is no order - those repos do not depend on each other, so they go in ' +
      'parallel or not at all. Across stages the order binds: releasing against an unreleased ' +
      'dependency ships a build no release names. The trailing count is commits past that repo' +
      "'s own latest tag, so it says a release is possible, not that one is warranted - the " +
      'CHANGELOG says that.',
  )
  out.push('')
  out.push(renderReleaseOrder(edges, states, [...states.keys()]))
  out.push('')
  out.push(
    'A `~` marks a dependency no manifest declares, read out of the repo\'s own CI: a vendored ' +
      'grammar or an embedded engine build is usually checked against its source by a workflow, ' +
      'and that checkout names it. It is coupling rather than containment - a manifest pin says ' +
      'this build CONTAINS that version, a workflow checkout says the two are TESTED together - ' +
      'so it never decides a stage, and a vendored file with no CI check on it stays invisible.',
  )
  out.push('')
  out.push(
    'The spec\'s own devDependencies are left out of the layering: `' + SPEC_REPO + '` dev-depends ' +
      'on its engines to render its own corpus and they submodule the spec back, which is a ' +
      'verification cycle rather than a build dependency. It does mean a spec cut wants the ' +
      'engine pin bumped first, and an engine cut wants its spec submodule current.',
  )
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
  out.push(
    '| 🔗 undeclared | No manifest declares it; the repo\'s own CI checks the target out. ' +
      'Coupling rather than containment, and it pins nothing by construction. |',
  )
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

export { classify, parseManifest, renderMermaid, renderSpine, renderConsumers, releaseLayers, renderReleaseOrder, ciReferences, notARelease, vendorProvenance, parseDeclaredDependencies, auditDeclared }

async function main() {
  const repos = await api(`orgs/${ORG}/repos?per_page=100&type=public`)
  const live = (repos ?? []).filter((repo) => !repo.archived && !repo.fork)
  const liveNames = new Set(live.map((repo) => repo.name))

  const perRepo = await mapLimit(live, CONCURRENCY, async (repo) => {
    const { manifests, gitlinks, workflows, vendored } = await repoManifestPaths(repo.name, repo.default_branch)
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
    // VENDORED BUILDS BEFORE CI, because a committed artifact with a commit in
    // its header is a HARDER statement than a workflow checkout: the build
    // contains that version rather than being tested against it.
    for (const path of vendored ?? []) {
      const head = await readHead(repo.name, path, repo.default_branch)
      if (!head) continue
      const found_ = vendorProvenance(head, repo.name, liveNames)
      if (!found_) continue
      found.push({
        kind: 'vendor',
        ref: found_.ref,
        target: found_.target,
        name: found_.target,
        spec: found_.ref ? `${found_.target}@${found_.ref}` : found_.target,
        field: 'vendored',
        path,
        repo: repo.name,
      })
    }

    // CI SECOND, so a repo that both declares and checks out a target keeps the
    // declared edge: the pin is the stronger statement and the dedupe below is
    // first-one-wins per (repo, target, ref).
    const declared = new Set(found.map((edge) => edge.target))
    for (const path of workflows ?? []) {
      const text = await readFile(repo.name, path, repo.default_branch)
      if (!text) continue
      for (const target of ciReferences(text, repo.name, liveNames)) {
        if (declared.has(target)) continue
        found.push({
          kind: 'ci',
          ref: null,
          target,
          name: target,
          spec: '',
          field: 'workflow',
          path,
          repo: repo.name,
        })
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

  // THE HAND-WRITTEN HALF, APPLIED AFTER DETECTION so the audit can tell a line
  // that is still needed from one the detectors have caught up with.
  const ledgerPath = resolve(repoRoot, 'resources/undeclared-dependencies.txt')
  const ledger = existsSync(ledgerPath)
    ? parseDeclaredDependencies(readFileSync(ledgerPath, 'utf8'))
    : { rows: [], problems: [] }
  const ledgerProblems = [
    ...ledger.problems,
    ...auditDeclared(ledger.rows, flat, liveNames),
  ]

  const suppressed = new Set(
    ledger.rows.filter((row) => row.kind === 'not-a-dependency').map((row) => `${row.repo}|${row.target}`),
  )
  const kept = flat.filter((edge) => !suppressed.has(`${edge.repo}|${edge.target}`))
  for (const row of ledger.rows) {
    if (row.kind === 'not-a-dependency') continue
    kept.push({
      kind: row.kind === 'vendors' ? 'vendor-declared' : 'ci',
      ref: null,
      target: row.target,
      name: row.target,
      spec: '',
      field: 'declared',
      path: 'resources/undeclared-dependencies.txt',
      repo: row.repo,
      declaredReason: row.reason,
    })
  }

  const resolved = await mapLimit(kept, CONCURRENCY, resolveEdge)
  const skipped = live.filter((repo) => !resolved.some((edge) => edge.repo === repo.name)).map((repo) => repo.name)

  if (flag('json')) {
    const text = `${JSON.stringify({ org: ORG, edges: resolved, skipped }, null, 2)}\n`
    const out = value('out', null)
    if (out) writeFileSync(out, text)
    else process.stdout.write(text)
    return
  }

  // EVERY repo's state, not just the ones an edge points at. A repo with no
  // incoming edge still has a tag and still has commits past it, and leaving it
  // out would silently drop the whole unconstrained tail of the release order -
  // the editors and the standalone tools - from a list that claims to be one.
  const states = new Map(
    await mapLimit(live, CONCURRENCY, async (repo) => [repo.name, await targetState(repo.name)]),
  )

  if (ledgerProblems.length) {
    // Reported on stderr rather than thrown: the tool's contract is that it
    // describes the org and does not fail on it (see the header). A ledger
    // problem is still loud, and `--check` is where a gate belongs.
    console.error('resources/undeclared-dependencies.txt:')
    for (const problem of ledgerProblems) console.error(`  ${problem}`)
  }

  const markdown = `${renderMarkdown(resolved, {
    repos: live.length,
    skipped,
    states,
    generatedFrom: 'each repository\'s default branch',
  })}\n`
  const out = value('out', null)
  if (out) writeFileSync(out, markdown)
  else process.stdout.write(markdown)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
