#!/usr/bin/env node
/*
 * Checks the EXTERNAL links in the docs. Deliberately a script, not a test:
 * it needs a network, so wiring it into `npm test` would make the suite fail
 * for reasons that have nothing to do with the repository.
 *
 * Links into this repo's own source are checked offline and in CI by
 * tests/repo-links.test.mjs. This covers the rest.
 *
 * Usage: npm run links:check
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

/*
 * Hosts that must never be fetched. example.com and friends are RFC 2606
 * placeholders that appear inside example markup - requesting them tests
 * nothing and, for the localhost forms, could hit whatever is listening.
 */
const NEVER_FETCH = [
  /^https?:\/\/(www\.)?example\.(com|org|net)/,
  /^https?:\/\/localhost/,
  /^https?:\/\/127\.0\.0\.1/,
  /^https?:\/\/[^/]*\.invalid/,
]

const files = execFileSync('git', ['ls-files', 'docs', 'resources', '*.md'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter((path) => path.endsWith('.md') && !path.startsWith('docs/examples/'))

/*
 * PROSE ONLY. A URL inside a fence or a `::: compare` block is fixture
 * content - `https://e.com`, `https://xn--fsq.jp` and friends exist to
 * exercise the URL parser, not to be reachable. Fetching them reports dozens
 * of "failures" that are the corpus working as designed.
 */
const proseLines = (text) => {
  const out = []
  let fence = null
  let compare = null
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (fence) {
      if (trimmed.startsWith(fence)) fence = null
      continue
    }
    const opener = trimmed.match(/^(`{3,}|~{3,})/)
    if (opener) { fence = opener[1]; continue }
    if (compare) {
      if (trimmed === compare) compare = null
      continue
    }
    const block = trimmed.match(/^(:{3,})\s+compare\b/)
    if (block) { compare = block[1]; continue }
    /* Inline code spans are examples too: `[text](https://url)` in the
     * cheat sheet and `http://evil/x.docm` in the security page are shapes
     * being discussed, not destinations. */
    out.push(line.replace(/`[^`]*`/g, ''))
  }
  return out.join('\n')
}

/*
 * The version this repo is PREPARING. A compare link whose newer end names it
 * cannot resolve until the tag exists, and the tag is cut after the docs are
 * written - so fetching it reports a 404 through every release cut. That is
 * the gate failing on its own ordering rather than a bad link, so the one
 * range ending at the unreleased version is skipped until it is tagged.
 */
const pendingVersion = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).version
const hasTag = (version) => {
  try {
    return execFileSync('git', ['tag', '--list', version], { cwd: repoRoot, encoding: 'utf8' }).trim() !== ''
  } catch {
    return false
  }
}
const pendingTag = pendingVersion && !hasTag(pendingVersion)
const isPendingCompare = (url) => {
  const match = url.match(/^https?:\/\/github\.com\/[^/]+\/[^/]+\/compare\/[^.]\S*?\.\.\.(\S+)$/)
  return pendingTag && match !== null && match[1] === pendingVersion
}

const targets = new Map()
const pending = []
for (const file of files) {
  const text = proseLines(readFileSync(resolve(repoRoot, file), 'utf8'))
  for (const match of text.matchAll(/https?:\/\/[^)\s"'<>\]]+/g)) {
    const url = match[0].replace(/[.,;:]+$/, '')
    if (NEVER_FETCH.some((pattern) => pattern.test(url))) continue
    if (isPendingCompare(url)) {
      pending.push({ url, file })
      continue
    }
    if (!targets.has(url)) targets.set(url, new Set())
    targets.get(url).add(file)
  }
}

console.log(`checking ${targets.size} external links from ${files.length} files\n`)

for (const { url, file } of pending) {
  console.log(`  SKIPPED pending the ${pendingVersion} tag  ${url}\n    cited by: ${file}`)
}
if (pending.length > 0) console.log('')

const failures = []
const entries = [...targets]
const CONCURRENCY = 8
let cursor = 0

const probe = async (url) => {
  /* HEAD first: cheaper, and enough for most hosts. Some reject it, so fall
   * back to a ranged GET rather than reporting a false break. */
  for (const init of [{ method: 'HEAD' }, { method: 'GET', headers: { range: 'bytes=0-0' } }]) {
    try {
      const response = await fetch(url, {
        ...init,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      })
      if (response.ok || response.status === 403) return null
      if (init.method === 'GET') return `HTTP ${response.status}`
    } catch (error) {
      if (init.method === 'GET') return error.name === 'TimeoutError' ? 'timeout' : error.message
    }
  }
  return 'unreachable'
}

const worker = async () => {
  while (cursor < entries.length) {
    const [url, sources] = entries[cursor++]
    const problem = await probe(url)
    if (problem) {
      failures.push({ url, problem, sources: [...sources] })
      console.log(`  BROKEN  ${problem.padEnd(14)} ${url}`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

if (failures.length === 0) {
  console.log('all external links resolved')
  process.exit(0)
}
console.log(`\n${failures.length} link(s) did not resolve:\n`)
for (const { url, problem, sources } of failures) {
  console.log(`  ${url}\n    ${problem}\n    cited by: ${sources.join(', ')}`)
}
/*
 * A non-zero exit so this is usable from a scheduled job. It is NOT part of
 * `npm test`: a link can break for reasons no commit caused.
 */
process.exit(1)
