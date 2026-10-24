#!/usr/bin/env node
/*
 * Report dependencies between markup-carve repositories from manifests, CI
 * workflows, submodules, and provenance headers in committed builds. The wiki's
 * Version Map records releases but cannot derive these edges from prose.
 *
 * This command reports unreleased and lagging pins; it does not fail on them.
 * Different release schedules can leave a pin behind intentionally.
 *
 * Usage:
 *   node tools/dependency-map.mjs                 # Markdown to stdout
 *   node tools/dependency-map.mjs --json          # data without rendering
 *   node tools/dependency-map.mjs --out FILE      # write a file
 *   node tools/dependency-map.mjs --org NAME      # default: markup-carve
 *   node tools/dependency-map.mjs --mirror-dir DIR --stats
 *   node tools/dependency-map.mjs --remote        # REST fallback for CI
 *   node tools/dependency-map.mjs --out F --changed-vs G
 *                                      # prints substantive or cosmetic change
 *
 * Requires an authenticated `gh` CLI.
 */

import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { parseDependencyLedger, auditDependencyLedger } from '../scripts/lib/drift-ledger.mjs'

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
const REMOTE = flag('remote')
const MIRROR_DIR = value('mirror-dir', process.env.DEPMAP_MIRROR_DIR ?? '/media/mark/data/work/git/_org-mirror') // host-path-guard: intentional
const stats = { mirrorsFetched: 0, restCalls: 0, graphqlCalls: 0 }
const mirrors = new Map()
const repoMetadata = new Map()
const shell = async (command, argv, options = {}) => (await run(command, argv, { maxBuffer: 64 * 1024 * 1024, ...options })).stdout
const git = (repo, argv) => shell('git', ['--git-dir', mirrors.get(repo), ...argv])

async function discoverLocal() {
  const query = `query($org: String!) { organization(login: $org) { repositories(first: 100, privacy: PUBLIC) { pageInfo { hasNextPage } nodes { name isArchived isFork defaultBranchRef { name } pullRequests(first: 100, states: OPEN) { pageInfo { hasNextPage } nodes { number headRefOid baseRefName } } } } } }`
  stats.graphqlCalls++
  const result = JSON.parse(await shell('gh', ['api', 'graphql', '-f', `query=${query}`, '-F', `org=${ORG}`]))
  const list = result.data?.organization?.repositories
  if (!list || list.pageInfo.hasNextPage || list.nodes.some((repo) => repo.pullRequests.pageInfo.hasNextPage)) {
    throw new Error('GraphQL repository or pull request list exceeds one page')
  }
  return list.nodes.filter((repo) => !repo.isArchived && !repo.isFork && repo.defaultBranchRef).map((repo) => ({
    name: repo.name, default_branch: repo.defaultBranchRef.name, pulls: repo.pullRequests.nodes.map((pull) => ({ number: pull.number, head: { sha: pull.headRefOid }, base: { ref: pull.baseRefName } })),
  }))
}

async function fetchMirror(repo) {
  mkdirSync(MIRROR_DIR, { recursive: true })
  const path = resolve(MIRROR_DIR, `${ORG}-${repo.name}.git`)
  if (!existsSync(path)) await shell('git', ['clone', '--bare', '--filter=blob:none', `git@github.com:${ORG}/${repo.name}.git`, path])
  mirrors.set(repo.name, path)
  await git(repo.name, ['fetch', '--quiet', 'origin', '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*', '+refs/pull/*/head:refs/pull/*/head'])
  stats.mirrorsFetched++
}

async function localFile(repo, path, ref) {
  try { return await git(repo, ['show', `${ref}:${path}`]) } catch { return null }
}

async function localTree(repo, ref) {
  const output = await git(repo, ['ls-tree', '-rz', ref])
  return output.split('\0').filter(Boolean).map((line) => {
    const [meta, path] = line.split('\t')
    const [mode, type, sha] = meta.split(' ')
    return { mode, type, sha, path }
  })
}

async function localChangedPaths(repo, base, head) {
  const output = await git(repo, ['diff', '--name-status', '-z', `${base}...${head}`])
  const fields = output.split('\0').filter(Boolean)
  const paths = []
  for (let i = 0; i < fields.length;) {
    const status = fields[i++]
    const old = fields[i++]
    const path = status.startsWith('R') || status.startsWith('C') ? fields[i++] : old
    if (!status.startsWith('D')) paths.push({ filename: path, status })
  }
  return paths
}

function semverOrder(a, b) {
  const [ap, bp] = [a, b].map(semverParts)
  for (let i = 0; i < 3; i++) if (ap[i] !== bp[i]) return bp[i] - ap[i]
  return a.localeCompare(b, 'en', { numeric: true })
}

/** `gh api` as JSON, with 404 as a value rather than a throw. */
async function api(path, { raw = false } = {}) {
  stats.restCalls++
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
  ['requirements.txt', 'pythonreq'],
  ['.gitmodules', 'submodule'],
  ['extension.toml', 'zed'],
  ['Cargo.lock', 'cargolock'],
  ['Gemfile', 'ruby'],
])

/** List tracked paths once, then read only the inputs present in the tree. */
async function repoManifestPaths(repo, branch) {
  const tree = REMOTE ? await api(`repos/${ORG}/${repo}/git/trees/${branch}?recursive=1`) : { tree: await localTree(repo, branch) }
  if (!tree?.tree) return { manifests: [], gitlinks: new Map(), vendorPins: [], hasDeclaration: false }
  const wanted = []
  // A gitlink carries the submodule commit; `.gitmodules` only names its URL.
  const gitlinks = new Map()
  const workflows = []
  const vendored = []
  const vendorPins = []
  for (const entry of tree.tree) {
    if (entry.type === 'commit') gitlinks.set(entry.path, entry.sha)
    if (entry.type !== 'blob') continue
    // CI checkouts can reveal dependencies absent from manifests.
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.path)) workflows.push(entry.path)
    // Check candidate artifacts for a provenance header below.
    if (vendorCandidate(entry.path)) vendored.push(entry.path)
    if (!/(^|\/)node_modules\//.test(entry.path) && (VENDOR_NOTE.test(entry.path) || VENDOR_SCRIPT.test(entry.path))) {
      vendorPins.push(entry.path)
    }
    // Include `ext/<name>/Cargo.lock` while skipping deeper test fixtures.
    const segments = entry.path.split('/')
    if (segments.length > 3) continue
    const base = segments.at(-1)
    // A tap formula names no package: its pin is the release-asset url it downloads.
    if (/^Formula\/[^/]+\.rb$/.test(entry.path)) wanted.push({ path: entry.path, kind: 'brew' })
    else if (MANIFESTS.has(base)) wanted.push({ path: entry.path, kind: MANIFESTS.get(base) })
    else if (base.endsWith('.gemspec') || base.endsWith('.rockspec')) {
      wanted.push({ path: entry.path, kind: 'ruby' })
    }
  }
  return { manifests: wanted, gitlinks, workflows, vendored, vendorPins, hasDeclaration: tree.tree.some((entry) => entry.path === '.carve-deps.json') }
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
// UPSTREAM.md: a byte-for-byte copy cannot carry a header, so its directory's note does.
const VENDOR_CANDIDATE = /\.(js|mjs|cjs|jsx|tsx|wasm|css|py|rb|lua|php|go|ts|sh)$|(^|\/)UPSTREAM\.md$/
const VENDOR_EXCLUDED = /(^|\/)(node_modules|vendor|vendors|\.vendor|venv|\.venv|site-packages|test|tests|fixtures|testdata|__fixtures__)(\/|$)/i
const VENDOR_TEST_FILE = /(?:^|\/)(?:test_[^/]+\.(?:py|rb)|[^/]+(?:[._-]test|[._-]spec)\.(?:js|mjs|cjs|jsx|tsx|py|rb|lua|php|go|ts|sh))$/i
const vendorCandidate = (path) => VENDOR_CANDIDATE.test(path) && !VENDOR_EXCLUDED.test(path) && !VENDOR_TEST_FILE.test(path)

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
 * Only the first bytes are parsed. Remote mode uses a range request; local
 * mode reads the blob through git and slices the header.
 */
const VENDOR_HEADER = /^\s*(?:(?:\/\/|#|\/\*|\*|--|<!--)\s*)?(?:Bundled|Generated|Vendored|Copied)\s+from\s+markup-carve\/([a-z0-9][a-z0-9.-]*)/im

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
const VENDOR_COMMIT_FIELD = /\b[A-Z_]*(?:SOURCE|VENDOR|UPSTREAM)_COMMIT\s*=\s*['"]([0-9a-f]{7,40})\b/i
const VENDOR_TAG = /\b(?:tag|version)\s+(v?\d+\.\d+\.\d+(?:-[\w.-]+)?)\b/i

function vendorProvenance(head, self, known) {
  const match = VENDOR_HEADER.exec(head)
  if (!match) return null
  const target = match[1].replace(/\.git$/, '')
  if (target === self || !known.has(target)) return null
  const inlineTag = /^(?:\s+|@)(v?\d+\.\d+\.\d+(?:-[\w.-]+)?)/i.exec(head.slice(match.index + match[0].length))?.[1]
  return { target, ref: VENDOR_COMMIT.exec(head)?.[1] ?? VENDOR_COMMIT_FIELD.exec(head)?.[1] ?? VENDOR_TAG.exec(head)?.[1] ?? inlineTag ?? null }
}

const DECLARATION_KINDS = new Set(['runtime-cdn', 'build-download', 'docs', 'vendored', 'other'])
function parseDeclarations(text, self, known, path = '.carve-deps.json') {
  const document = JSON.parse(text)
  if (!document || !Array.isArray(document.needs)) throw new Error(`${self}/${path}: needs must be an array`)
  return document.needs.map((item) => {
    if (!item || typeof item !== 'object') throw new Error(`${self}/${path}: invalid dependency declaration`)
    const match = /^markup-carve\/([a-z0-9][a-z0-9.-]*)$/.exec(item.repo ?? '')
    if (!match || !known.has(match[1]) || match[1] === self || !DECLARATION_KINDS.has(item.kind) || !String(item.reason ?? '').trim()) {
      throw new Error(`${self}/${path}: invalid dependency declaration`)
    }
    return { kind: 'declared', target: match[1], ref: null, name: match[1], spec: item.kind, field: item.kind, path, repo: self, declaredReason: item.reason }
  })
}

function changedEdges(next, base) {
  const old = new Set(base.map((edge) => `${edge.target}|${edge.kind}|${edge.ref ?? edge.spec}`))
  return next.filter((edge) => !old.has(`${edge.target}|${edge.kind}|${edge.ref ?? edge.spec}`))
}

// A copy pinned only in prose or in the script that fetches it: no header carries it.
const VENDOR_NOTE = /(^|\/)([^/]*VENDOR[^/]*|UPSTREAM)\.md$/i
const VENDOR_SCRIPT = /(^|\/)[^/]*vendor[^/]*\.(sh|bash|zsh|mjs|cjs|js|py|rb|ps1)$/i
const SEMVER_OR_SHA = String.raw`v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?|[0-9a-f]{7,40}`

/** Table rows in a vendor note that link an org repo and give it a version cell. */
function vendorNotePins(text, self, known) {
  const found = []
  const isVersion = (cell) => /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cell ?? '')
  // A header cell named Version decides the column; any version-shaped cell is the fallback.
  let versionColumn = -1
  for (const line of String(text).split('\n')) {
    if (!line.trimStart().startsWith('|')) {
      versionColumn = -1
      continue
    }
    const cells = line.split('|').map((cell) => cell.trim().replace(/^`(.*)`$/, '$1'))
    const header = cells.findIndex((cell) => /^(version|tag|ref|pin)$/i.test(cell))
    if (header >= 0) versionColumn = header
    const repo = /github\.com\/markup-carve\/([a-z0-9][a-z0-9.-]*?)(?:\.git)?(?=[)\s/#|]|$)/i.exec(line)?.[1]
    if (!repo || repo === self || !known.has(repo)) continue
    const version = versionColumn >= 0 ? (isVersion(cells[versionColumn]) ? cells[versionColumn] : null) : cells.find(isVersion)
    if (version) found.push({ target: repo, ref: version })
  }
  return found
}

/** `CARVE_GRAMMARS_TAG="v0.1.18"` names carve-grammars, if the file also links that repo. */
function vendorScriptPins(text, self, known) {
  const body = String(text)
  const assignment = new RegExp(
    String.raw`^[ \t]*(?:export\s+|readonly\s+|declare\s+(?:-\w+\s+)*|const\s+|let\s+|var\s+|\$)?` +
      String.raw`([A-Z][A-Z0-9_]*?)_(?:TAG|VERSION|REF)\s*:?=\s*["']?(?:\$\{\w+:-)?(${SEMVER_OR_SHA})\}?["']?\s*;?[ \t]*(?:#.*)?$`,
    'gm',
  )
  const found = new Map()
  for (const match of body.matchAll(assignment)) {
    const target = match[1].toLowerCase().replace(/_/g, '-')
    if (target === self || !known.has(target)) continue
    if (!body.includes(`markup-carve/${target}`)) continue
    if (!found.has(target)) found.set(target, { target, ref: match[2] })
  }
  return [...found.values()]
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

/*
 * AN INSTALL IN CI IS A PIN, not a checkout. A demo that builds its site with
 * `pip install "git+https://github.com/markup-carve/x@main"` ships whatever
 * that ref serves, and has no manifest to say so. Returned as git edges so the
 * ref is resolved like any other: a branch reads as unpinned, a tag as released.
 */
function ciInstalls(text, self, known) {
  const found = new Map()
  const org = ORG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const spec = new RegExp(
    `(?:git\\+https?://github\\.com/|github:)${org}/([a-z0-9][a-z0-9.-]*?)(?:\\.git)?(?:[@#]([\\w./-]+))?(?=["'\\s]|$)`,
    'gi',
  )
  for (const line of text.replace(/\\\r?\n/g, ' ').split('\n')) {
    // Only a command that installs: a comment, an echo or an env value naming the url is not one.
    const command = line.replace(/^\s*(?:-\s*)?(?:run:\s*)?/, '')
    if (!/^(?:uv\s+|python3?\s+-m\s+)?(?:pip3?|npm|pnpm|yarn)\s+(?:install|add|i)\b/i.test(command)) continue
    for (const match of command.matchAll(spec)) {
      const [, name, ref = null] = match
      if (name === self || !known.has(name)) continue
      const key = `${name}@${ref ?? ''}`
      if (!found.has(key)) found.set(key, { target: name, ref })
    }
  }
  return [...found.values()]
}

async function readFile(repo, path, branch) {
  return REMOTE ? api(`repos/${ORG}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, { raw: true }) : localFile(repo, path, branch)
}

/*
 * The first bytes of a file.
 *
 * The remote contents API returns the whole blob, and a vendored bundle is routinely
 * over a megabyte - fetching fifty of them to read three comment lines would
 * turn a cheap report into a slow one. Raw content honours a range request, so
 * this is 300 bytes per candidate. A server that ignores the range still
 * answers correctly, just wastefully, and the slice bounds it either way.
 */
async function readHead(repo, path, branch, bytes = 512) {
  if (!REMOTE) return (await localFile(repo, path, branch))?.slice(0, bytes) ?? null
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
  ['pygments-carve', 'pygments-carve'],
  ['zensical-carve', 'zensical-carve'],
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
    const ecosystem = kind === 'python' || kind === 'pythonreq' ? 'python' : kind === 'ruby' ? 'ruby' : kind
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

  if (kind === 'pythonreq') {
    for (const line of text.split('\n')) {
      const match = /^\s*([A-Za-z0-9._-]+)\s*([<>=!~].*)?$/.exec(line.split('#', 1)[0])
      if (!match || !match[1].includes('carve')) continue
      push(match[1], match[2]?.trim() || '*', 'requirements')
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

  if (kind === 'brew') {
    const seen = new Set()
    for (const match of text.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+)\/releases\/download\/([^/"\s]+)\//g)) {
      const [, owner, target, tag] = match
      if (owner.toLowerCase() !== ORG.toLowerCase() || seen.has(`${target}@${tag}`)) continue
      seen.add(`${target}@${tag}`)
      edges.push({ kind: 'git', ref: tag, target, name: '(formula)', spec: `${target}@${tag}`, field: 'formula', path })
    }
    // A formula built from source names the repo by git url and tag instead
    // (crv2pdf.rb). `head` urls are excluded: they follow a branch, not a pin.
    for (const match of text.matchAll(/^\s*url\s+"https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?",\s*tag:\s*"([^"]+)"/gm)) {
      const [, owner, target, tag] = match
      if (owner.toLowerCase() !== ORG.toLowerCase() || seen.has(`${target}@${tag}`)) continue
      seen.add(`${target}@${tag}`)
      edges.push({ kind: 'git', ref: tag, target, name: '(formula)', spec: `${target}@${tag}`, field: 'formula', path })
    }
    // A staged npm resource pins its package by the tarball's version.
    for (const match of text.matchAll(/registry\.npmjs\.org\/((?:@[\w.-]+\/)?[\w.-]+)\/-\/[\w.-]+?-(\d[\w.+-]*)\.tgz/g)) {
      push(match[1], match[2], 'formula')
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
    const meta = REMOTE ? await api(`repos/${ORG}/${repo}`) : repoMetadata.get(repo)
    if (!meta) return null
    const [tags, release] = REMOTE ? await Promise.all([
      api(`repos/${ORG}/${repo}/tags?per_page=100`),
      api(`repos/${ORG}/${repo}/releases/latest`),
    ]) : [await localTags(repo), null]
    const bySha = new Map()
    for (const tag of tags ?? []) bySha.set(tag.commit.sha, tag.name)
    const latestTag = tags?.[0]?.name ?? null
    const latestRelease = REMOTE ? release?.tag_name ?? null : latestTag
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
  if (!REMOTE) {
    try {
      const counts = (await git(repo, ['rev-list', '--left-right', '--count', `${base}...${head}`])).trim().split(/\s+/).map(Number)
      return { ahead: counts[1], behind: counts[0], status: counts[0] && counts[1] ? 'diverged' : counts[1] ? 'ahead' : counts[0] ? 'behind' : 'identical' }
    } catch { return null }
  }
  const compare = await api(`repos/${ORG}/${repo}/compare/${base}...${head}`)
  if (!compare) return null
  return { ahead: compare.ahead_by, behind: compare.behind_by, status: compare.status }
}

async function localTags(repo) {
  const names = (await git(repo, ['tag', '--list'])).trim().split('\n').filter((name) => /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(name)).sort(semverOrder)
  return Promise.all(names.map(async (name) => ({ name, commit: { sha: (await git(repo, ['rev-list', '-n', '1', name])).trim() } })))
}

const semverParts = (name) => name.replace(/^v/, '').split(/[-+]/)[0].split('.').map(Number)

/** A vendored copy pinned by tag name: released, behind the latest release, or not a tag at all. */
function vendorVerdict(ref, tagNames, latest) {
  const bare = (name) => name.replace(/^v/, '')
  const tag = tagNames.find((name) => bare(name) === bare(ref))
  if (!tag) return { verdict: 'unreleased', note: `names ${ref}, which is not a tag` }
  if (!latest || bare(tag) === bare(latest)) return { verdict: 'released', note: `the ${tag} tag` }
  const [a, b] = [semverParts(tag), semverParts(latest)]
  const order = a.map((part, i) => part - (b[i] ?? 0)).find((diff) => diff !== 0) ?? 0
  // Same numbers: no suffix outranks any prerelease, and rc.2 outranks rc.1.
  const suffix = (name) => /^v?\d+\.\d+\.\d+-(.+)$/.exec(name)?.[1] ?? null
  const [sa, sb] = [suffix(tag), suffix(latest)]
  const tie = sa === sb ? 0 : sa === null ? 1 : sb === null ? -1 : sa.localeCompare(sb, 'en', { numeric: true })
  if (order < 0 || (order === 0 && tie < 0)) return { verdict: 'behind-release', note: `the ${tag} tag; latest is ${latest}` }
  return { verdict: 'released', note: `the ${tag} tag, at or past ${latest}` }
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
      return { ...edge, verdict: 'unpinned-vendor', note: `vendored in ${edge.path}, header names no commit` }
    }
    if (!/^[0-9a-f]{7,40}$/i.test(edge.ref)) {
      const latest = state.latestRelease ?? state.latestTag
      const names = state.tags.map((tag) => tag.name)
      // Remote tags are limited to one page; ask for an older tag before calling it untagged.
      for (const name of [edge.ref, `v${edge.ref.replace(/^v/, '')}`, edge.ref.replace(/^v/, '')]) {
        if (names.includes(name)) break
        if (REMOTE && await api(`repos/${ORG}/${edge.target}/git/ref/tags/${encodeURIComponent(name)}`)) {
          names.push(name)
          break
        }
      }
      const { verdict, note } = vendorVerdict(edge.ref, names, latest)
      return { ...edge, resolved: edge.ref, latest, verdict, note: `vendored in ${edge.path}, ${note}` }
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
  if (edge.kind === 'declared') {
    return { ...edge, verdict: 'undeclared', note: `.carve-deps.json (${edge.field}): ${edge.declaredReason}` }
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
  'unpinned-vendor': { label: '🟠 unpinned-vendor', rank: 3 },
  local: { label: '⬚ local', rank: 1 },
  unknown: { label: '❔ unknown', rank: 1 },
}

const MERMAID_CLASS = {
  released: 'ok',
  'behind-release': 'old',
  range: 'range',
  unreleased: 'bad',
  unpinned: 'loose',
  'unpinned-vendor': 'loose',
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
  const raw = edge.pending ? `pending #${edge.pr.split('#')[1]}` : String(edge.resolved ?? edge.ref ?? edge.spec ?? '?')
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
    if (seen.has(key) && !edge.pending) continue
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
    const pending = edges.filter((edge) => edge.repo === repo && edge.pending).map((edge) => `${edge.target} (${edge.pr} pending)`)
    const declared = edges.filter((edge) => edge.repo === repo && edge.kind === 'declared').map((edge) => `${edge.target} (.carve-deps.json)`)
    return `${repo.padEnd(24)} ${version.padEnd(10)} ${lag}${[...pending, ...declared].length ? `  <- ${[...pending, ...declared].join(', ')}` : ''}`.trimEnd()
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
    lines.push(`  ${excluded.map((repo) => {
      const pending = edges.filter((edge) => edge.repo === repo && edge.pending).map((edge) => `${edge.target} (${edge.pr} pending)`)
      return pending.length ? `${repo} <- ${pending.join(', ')}` : repo
    }).join(', ')}`)
  }
  lines.push('```')
  return lines.join('\n')
}

/*
 * THE PAGE HOLDS TWO CLOCKS, AND THEY ARE NOT NEWS.
 *
 * `+N` in the release order is how far a repo has moved past its own tag, and
 * `N behind main` on an edge is how far a pin sits behind a moving head. Both
 * tick on every commit to the target, whether or not anything about who
 * depends on whom changed. Published as-is that is correct; used as the test
 * for WHETHER TO PUBLISH it means every run differs from the last, so the
 * automation commits on every run and the page's history stops being a record
 * of anything.
 *
 * So the decision to publish is taken on the page with those two fields
 * blanked, and the page that gets published is the real one. Masking is a
 * comparison device, never an output.
 *
 * NOT MASKED, deliberately: `34 BEHIND 0.1.4`. That is distance from a TAG.
 * It moves when the target releases or when the pin moves, and both of those
 * are exactly what this page exists to report.
 */
function volatileMask(text) {
  return text
    .replace(/, \d+ behind main/g, ', N behind main')
    // Anchored to a token boundary rather than end of line: a repo that is
    // coupled to others carries its lag BEFORE that list, so `+3` in
    // `intellij-carve 0.1.6 +3  <- carve, carve-css` sits mid-line. An
    // end-of-line anchor masked the bare rows and missed exactly the busiest
    // rows, which are the ones that tick most often.
    .replace(/(\s)\+\d+(?=\s|$)/gm, '$1+N')
}

/*
 * Is the difference between two renderings worth a commit?
 *
 * A page that does not exist yet is always worth writing, and so is one whose
 * masked form moved. Everything else is the clock.
 */
function isSubstantiveChange(before, after) {
  if (before === null || before === undefined) return true
  return volatileMask(before) !== volatileMask(after)
}

const TICK = '`'
const STALE_HEAD = '**Generated from a checkout that is not `main`.** '
const RUN_FROM = 'This run came from `'

/*
 * WAS THIS RUN MADE FROM A CHECKOUT THAT COULD SEE THE WHOLE GENERATOR?
 *
 * The page says "generated - do not edit by hand", which is honest about hand
 * edits while saying nothing about the other way it rots: a run from a checkout
 * parked on a feature branch, by a generator predating whatever the tool has
 * learned since that branch was cut.
 *
 * That is not hypothetical. A run from a branch older than the CI-read edges
 * (#1847) and the declaration ledger (#1851) rewrote the wiki page with 61
 * edges instead of 86 and dropped the whole Release order section - and the
 * result was indistinguishable from a page that had got shorter because
 * releases landed. Nobody could see it in the diff, because a regeneration
 * rewrites every line anyway. The next commit then hand-patched the degraded
 * page, which is how a generated document stops being generated.
 *
 * A missing section cannot announce itself, so the provenance has to. Silent
 * when the run came from the tip of main - which is what the automation in
 * .github/workflows/dependency-map.yml produces, and the case that should not
 * carry a banner.
 */
function staleSourceBanner({ sha, mainSha }) {
  if (!sha || !mainSha || sha === mainSha) return null
  return (
    STALE_HEAD +
    RUN_FROM + sha.slice(0, 8) + TICK + ', ' +
    'while ' + TICK + 'main' + TICK + ' is at ' + TICK + mainSha.slice(0, 8) + TICK + '. ' +
    'A generator older than the tree it ran from emits whatever it knew then, so a section it has ' +
    'since gained is MISSING here rather than empty, and that reads exactly like data that moved. ' +
    'Regenerate from ' + TICK + 'main' + TICK + ' before trusting this page.'
  )
}

function renderMarkdown(edges, { repos, skipped, generatedFrom, states, source }) {
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
  const stale = staleSourceBanner(source ?? {})
  if (stale) {
    out.push(stale)
    out.push('')
  }
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
  out.push('| 🟠 unpinned-vendor | A vendored header names a branch or no commit. |')
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
        `${edge.resolved ? `\`${edge.resolved}\`` : '-'} | ${VERDICTS[edge.verdict].label}${edge.pending ? ` (pending ${edge.pr})` : ''} | ${edge.note} |`,
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

export { localTree, localFile, localTags, localChangedPaths, distance, mirrors, VENDOR_CANDIDATE, vendorCandidate, parseDeclarations, changedEdges, VENDOR_NOTE, VENDOR_SCRIPT, vendorNotePins, vendorScriptPins, vendorVerdict, classify, parseManifest, renderMermaid, renderSpine, renderConsumers, releaseLayers, renderReleaseOrder, ciReferences, ciInstalls, notARelease, vendorProvenance, staleSourceBanner, volatileMask, isSubstantiveChange }

/*
 * What this run was generated FROM, for staleSourceBanner above.
 *
 * `ls-remote` rather than `fetch`: asking a question about the remote must not
 * write to the checkout somebody is working in, and a stale remote-tracking ref
 * is exactly the thing that would make this answer wrong.
 *
 * Every failure here is silent by design. A tarball with no `.git`, no network,
 * a remote named something other than `origin` - none of those say the run is
 * stale, they say the question cannot be answered, and a banner that fires on
 * "unknown" would be ignored within a week.
 */
async function sourceProvenance() {
  const git = async (args) => (await run('git', args, { cwd: repoRoot })).stdout.trim()
  try {
    const sha = await git(['rev-parse', 'HEAD'])
    const remote = await git(['ls-remote', 'origin', 'refs/heads/main'])
    const mainSha = remote.split(/\s+/)[0]
    return { sha, mainSha }
  } catch {
    return {}
  }
}

async function main() {
  const repos = REMOTE ? await api(`orgs/${ORG}/repos?per_page=100&type=public`) : await discoverLocal()
  const live = (repos ?? []).filter((repo) => !repo.archived && !repo.fork)
  const liveNames = new Set(live.map((repo) => repo.name))
  if (!REMOTE) {
    for (const repo of live) repoMetadata.set(repo.name, repo)
    await mapLimit(live, CONCURRENCY, fetchMirror)
  }

  const perRepo = await mapLimit(live, CONCURRENCY, async (repo) => {
    const { manifests, gitlinks, workflows, vendored, vendorPins, hasDeclaration } = await repoManifestPaths(repo.name, repo.default_branch)
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
    const vendorEdges = await mapLimit(vendored ?? [], CONCURRENCY, async (path) => {
      const head = await readHead(repo.name, path, repo.default_branch)
      if (!head) return null
      const found_ = vendorProvenance(head, repo.name, liveNames)
      if (!found_) return null
      return {
        kind: 'vendor',
        ref: found_.ref,
        target: found_.target,
        name: found_.target,
        spec: found_.ref ? `${found_.target}@${found_.ref}` : found_.target,
        field: 'vendored',
        path,
        repo: repo.name,
      }
    })
    found.push(...vendorEdges.filter(Boolean))

    for (const path of vendorPins ?? []) {
      const text = await readFile(repo.name, path, repo.default_branch)
      if (!text) continue
      const note = VENDOR_NOTE.test(path)
      const pins = note ? vendorNotePins(text, repo.name, liveNames) : vendorScriptPins(text, repo.name, liveNames)
      for (const { target, ref } of pins) {
        found.push({
          kind: 'vendor',
          ref,
          target,
          name: target,
          spec: `${target}@${ref}`,
          field: note ? 'vendor note' : 'vendor script',
          path,
          repo: repo.name,
        })
      }
    }

    // CI SECOND, so a repo that both declares and checks out a target keeps the
    // declared edge: the pin is the stronger statement and the dedupe below is
    // first-one-wins per (repo, target, ref).
    const texts = []
    for (const path of workflows ?? []) {
      const text = await readFile(repo.name, path, repo.default_branch)
      if (text) texts.push({ path, text })
    }
    for (const { path, text } of texts) {
      for (const { target, ref } of ciInstalls(text, repo.name, liveNames)) {
        found.push({ kind: 'git', ref, target, name: target, spec: ref ? `${target}@${ref}` : target, field: 'workflow install', path, repo: repo.name })
      }
    }
    const declared = new Set(found.map((edge) => edge.target))
    for (const { path, text } of texts) {
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
    const declaration = hasDeclaration ? await readFile(repo.name, '.carve-deps.json', repo.default_branch) : null
    if (declaration) found.push(...parseDeclarations(declaration, repo.name, liveNames))

    // Changed paths identify pending inputs; compare the PR head with its base.
    const pulls = REMOTE ? [] : repo.pulls
    for (let page = 1; REMOTE; page++) {
      const batch = await api(`repos/${ORG}/${repo.name}/pulls?state=open&per_page=100&page=${page}`)
      if (!batch?.length) break
      pulls.push(...batch)
      if (batch.length < 100) break
    }
    for (const pull of pulls ?? []) {
      for (let page = 1; REMOTE || page === 1; page++) {
        const files = REMOTE ? await api(`repos/${ORG}/${repo.name}/pulls/${pull.number}/files?per_page=100&page=${page}`) : await localChangedPaths(repo.name, pull.base.ref, `refs/pull/${pull.number}/head`)
        if (!files?.length) break
        for (const file of files) {
          if (file.status === 'removed') continue
          const path = file.filename
          const base = path.split('/').at(-1)
          const kind = /^Formula\/[^/]+\.rb$/.test(path) ? 'brew' :
            (MANIFESTS.get(base) ?? (base.endsWith('.gemspec') || base.endsWith('.rockspec') ? 'ruby' : null))
          const isDeclaration = path === '.carve-deps.json'
          const isVendor = vendorCandidate(path)
          if (!kind && !isDeclaration && !isVendor) continue
          const readEdges = async (ref) => {
            const edges = []
            if (kind || isDeclaration) {
              const contents = await readFile(repo.name, path, ref)
              if (contents) {
                if (isDeclaration) edges.push(...parseDeclarations(contents, repo.name, liveNames))
                else edges.push(...parseManifest(kind, path, contents, gitlinks).filter((edge) => edge.target !== repo.name)
                  .map((edge) => ({ ...edge, repo: repo.name })))
              }
            }
            if (isVendor) {
              const head = await readHead(repo.name, path, ref)
              const source = head && vendorProvenance(head, repo.name, liveNames)
              if (source) edges.push({ kind: 'vendor', ref: source.ref, target: source.target, name: source.target,
                spec: source.ref ? `${source.target}@${source.ref}` : source.target, field: 'vendored', path, repo: repo.name })
            }
            return edges
          }
          const [next, previous] = await Promise.all([readEdges(REMOTE ? pull.head.sha : `refs/pull/${pull.number}/head`), readEdges(REMOTE ? repo.default_branch : pull.base.ref)])
          for (const edge of changedEdges(next, previous)) found.push({ ...edge, pending: true, pr: `${repo.name}#${pull.number}` })
        }
        if (files.length < 100) break
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
    // `v0.1.18` in a script and `0.1.18` in a note are one pin.
    const key = `${edge.repo}|${edge.target}|${String(edge.ref ?? edge.spec).replace(/^v(?=\d)/, '')}|${edge.pr ?? ''}`
    const seen = byPin.get(key)
    if (seen) seen.paths.push(edge.path)
    else byPin.set(key, { ...edge, paths: [edge.path] })
  }
  const flat = [...byPin.values()]

  // THE HAND-WRITTEN HALF, APPLIED AFTER DETECTION so the audit can tell a line
  // that is still needed from one the detectors have caught up with.
  const ledgerPath = resolve(repoRoot, 'resources/undeclared-dependencies.txt')
  const ledger = existsSync(ledgerPath)
    ? parseDependencyLedger(ledgerPath)
    : { entries: new Map(), failures: [] }
  const declared = [...ledger.entries.values()]
  const ledgerProblems = [
    ...ledger.failures,
    ...auditDependencyLedger(declared, flat, liveNames),
  ]

  const suppressed = new Set(
    declared.filter((row) => row.kind === 'not-a-dependency').map((row) => `${row.repo}|${row.target}`),
  )
  const kept = flat.filter((edge) => !suppressed.has(`${edge.repo}|${edge.target}`))
  for (const row of declared) {
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

  const printStats = () => { if (flag('stats')) console.error(JSON.stringify(stats)) }
  if (flag('json')) {
    const text = `${JSON.stringify({ org: ORG, edges: resolved, skipped }, null, 2)}\n`
    const out = value('out', null)
    if (out) writeFileSync(out, text)
    else process.stdout.write(text)
    printStats()
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
    source: await sourceProvenance(),
  })}\n`
  const out = value('out', null)

  // `--changed-vs FILE` answers "should this be published?" without deciding
  // it. The file is still written either way: a caller that wants the page
  // wants it whichever verdict comes back, and one that acts on the verdict
  // should act on it rather than on this tool's exit status. Printed on stdout
  // because --out is what frees stdout up; without --out the page is the
  // output and the verdict has nowhere to go that is not the page.
  const against = value('changed-vs', null)
  if (out) writeFileSync(out, markdown)
  else process.stdout.write(markdown)
  printStats()
  if (against && out) {
    const before = existsSync(against) ? readFileSync(against, 'utf8') : null
    process.stdout.write(isSubstantiveChange(before, markdown) ? 'substantive\n' : 'cosmetic\n')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
