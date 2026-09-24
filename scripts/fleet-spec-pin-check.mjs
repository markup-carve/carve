#!/usr/bin/env node
/*
 * DO THE ENGINES IMPLEMENT THE SAME SPEC?
 *
 * Every engine vendors this repository as a submodule and pins it to a commit.
 * Each of them checks its own pin in CI: scripts/check-spec-pin-ancestry.sh
 * asserts the pinned commit is REACHABLE from spec main, which is a dangling-pin
 * check and catches a pin that resolves only because a deleted branch head has
 * not been collected yet.
 *
 * Nothing asserted the thing a release actually depends on: that the three
 * engines pin the SAME commit, so a payload accepted by one is accepted by all.
 *
 * The gap shipped. carve-php pinned 6e78b03f while carve-js and carve-rs pinned
 * c8164160 - the AST schema change from markup-carve/carve#2197 - and carve-php
 * accepted two payload shapes the other two refuse and refused one they accept.
 * Every per-engine gate was green throughout, correctly: 6e78b03f is an ancestor
 * of main, so "reachable from spec main" was true and said nothing about being
 * SEVEN COMMITS BEHIND the schema the other two had.
 *
 * Reachability is a per-repo property. Agreement is a fleet property, and it can
 * only be measured with all three in hand. This is the fleet half.
 *
 *   node scripts/fleet-spec-pin-check.mjs                  # engines at origin/main
 *   node scripts/fleet-spec-pin-check.mjs --ref worktree   # engines as checked out
 *   node scripts/fleet-spec-pin-check.mjs --ref <rev>      # engines at some revision
 *   node scripts/fleet-spec-pin-check.mjs --no-fetch       # skip the git fetches
 *
 * Engine halves default to each engine's `origin/main`, for the reason
 * scripts/declaration-audit.mjs gives: a local engine checkout is usually parked
 * on a feature branch and describes nothing anyone is about to release.
 *
 * A MISSING CHECKOUT FAILS rather than skipping. A fleet verdict computed from
 * two engines is not a fleet verdict, and the one that is missing is exactly
 * where the divergence would sit. Point the run at a clone with CARVE_JS_DIR /
 * CARVE_RS_DIR / CARVE_PHP_DIR rather than letting it pass unexamined.
 *
 * THE ESCAPE HATCH is .fleet-pin-exempt, in the shape .changelog-exempt uses:
 * one `carve-php@<sha>: <reason>` per line, the reason required, and every
 * exemption that applies printed on a passing run so what was waived stays
 * visible. Holding one engine back for a release is a legitimate call; a gate
 * with no way to express it is a gate people delete.
 *
 * The exemption is keyed on the PIN, not just the repo, and it is judged in both
 * directions. A line whose sha no longer matches that engine's pin, or whose
 * engine has rejoined the fleet, is an ERROR telling you to delete it. A
 * one-directional exemption is how this gate would rot into the state it exists
 * to find (markup-carve/carve#755).
 *
 * Exit 0  every non-exempt engine pins the same spec commit.
 * Exit 1  they do not, or an exemption is stale, or an engine is unreadable.
 * Exit 2  the run could not be set up (bad arguments, no spec history).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const ref = (() => {
  const i = argv.indexOf('--ref')
  if (i === -1) return 'origin/main'
  const value = argv[i + 1]
  if (!value) {
    console.error('--ref requires a revision (or the word `worktree`)')
    process.exit(2)
  }
  return value
})()
const doFetch = !argv.includes('--no-fetch') && ref === 'origin/main'

const SPEC_REMOTE = /markup-carve\/carve(\.git)?$/
const SPEC_BRANCH = process.env.SPEC_DEFAULT_BRANCH ?? 'main'

/* ------------------------------------------------------------------ repos */

/**
 * The same sibling-checkout convention scripts/declaration-audit.mjs uses,
 * including the linked-worktree case: a worktree lives anywhere, and its parent
 * holds no engine checkouts, so `--git-common-dir` is consulted too.
 */
function siblingRoots() {
  const roots = [resolve(repoRoot, '..')]
  try {
    const common = execFileSync(
      'git',
      ['-C', repoRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf8' },
    ).trim()
    if (common) roots.push(resolve(common, '../..'))
  } catch {
    /* not a git checkout; the plain sibling guess stands */
  }
  return roots
}

function engineDir(name, override) {
  if (override) return override
  for (const root of siblingRoots()) {
    const candidate = join(root, name)
    if (existsSync(candidate)) return candidate
  }
  return join(siblingRoots()[0], name)
}

const ENGINES = [
  { name: 'carve-js', dir: engineDir('carve-js', process.env.CARVE_JS_DIR) },
  { name: 'carve-rs', dir: engineDir('carve-rs', process.env.CARVE_RS_DIR) },
  { name: 'carve-php', dir: engineDir('carve-php', process.env.CARVE_PHP_DIR) },
]

/* -------------------------------------------------------------- spec side */

function spec(args) {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim()
}

// A FAILED FETCH IS NOT THE SAME FINDING ON BOTH SIDES, so they are handled
// separately rather than under one warning.
//
// Here, a stale tip only moves the DISTANCES and the reachability assertion. It
// cannot turn a divergent fleet into a passing one, because agreement is decided
// by comparing the engines with each other. So it warns and says the numbers may
// understate.
//
// In an ENGINE it is fatal: a stale `origin/main` there shows a pin that engine
// no longer has, and three stale refs that happen to match would approve a
// release the live fleet does not support. That is collected in `fetchFailed`
// below and reported as a finding.
const fetchFailed = []
if (doFetch) {
  try {
    execFileSync('git', ['-C', repoRoot, 'fetch', '--quiet', 'origin', SPEC_BRANCH], { stdio: 'ignore' })
  } catch {
    console.error(`  ! could not fetch origin/${SPEC_BRANCH} here - distances are measured against whatever is local, and may understate`)
  }
}

// `origin/main` is what a release run measures against. A checkout that has no
// such remote-tracking ref - a detached CI checkout, a clone of a fork - still
// has the history, so fall back rather than refusing to run, and SAY which ref
// answered. A distance measured against a different ref is a different number,
// and a reader who cannot see which one was used cannot tell.
let tip
let tipRef = `origin/${SPEC_BRANCH}`
for (const candidate of [`origin/${SPEC_BRANCH}`, SPEC_BRANCH, 'HEAD']) {
  try {
    tip = spec(['rev-parse', `${candidate}^{commit}`])
    tipRef = candidate
    break
  } catch {
    /* try the next one */
  }
}
if (!tip) {
  console.error(`cannot resolve origin/${SPEC_BRANCH}, ${SPEC_BRANCH} or HEAD in ${repoRoot}; this script must run from a spec checkout.`)
  process.exit(2)
}

const describe = (sha) => {
  try {
    const [date, subject] = spec(['log', '-1', '--format=%cs%x00%s', sha]).split('\0')
    return { date, subject }
  } catch {
    return null
  }
}

const countBetween = (from, to) => Number(spec(['rev-list', '--count', `${from}..${to}`]))

/* ------------------------------------------------------------ engine side */

/** The submodule path that vendors THIS repository, read from the engine's own
 *  .gitmodules at `ref`. Read rather than hard-coded because the three engines
 *  already disagree on it - carve-js uses `spec`, carve-rs and carve-php use
 *  `tests/spec` - and a fourth spelling must not read as "no pin". */
function specSubmodulePath(dir, at) {
  // `worktree` reads the INDEX here too, not the file on disk. The gitlink it is
  // paired with comes from the index, and a check whose two halves describe
  // different states can report a perfectly good staged pin as missing. Falls
  // back to disk only when .gitmodules is not in the index at all.
  const fromIndex = () => {
    try {
      return execFileSync('git', ['-C', dir, 'show', ':.gitmodules'], { encoding: 'utf8' })
    } catch {
      return readFileSync(join(dir, '.gitmodules'), 'utf8')
    }
  }
  const modules = at === 'worktree'
    ? fromIndex()
    : execFileSync('git', ['-C', dir, 'show', `${at}:.gitmodules`], { encoding: 'utf8' })
  let current = null
  const paths = new Map()
  const urls = new Map()
  for (const line of modules.split('\n')) {
    const section = line.match(/^\s*\[submodule\s+"(.+)"\]\s*$/)
    if (section) {
      current = section[1]
      continue
    }
    if (!current) continue
    const entry = line.match(/^\s*(path|url)\s*=\s*(.+?)\s*$/)
    if (!entry) continue
    ;(entry[1] === 'path' ? paths : urls).set(current, entry[2])
  }
  for (const [name, url] of urls) {
    if (SPEC_REMOTE.test(url.replace(/\.git$/, '')) || SPEC_REMOTE.test(url)) {
      const path = paths.get(name)
      if (path) return path
    }
  }
  throw new Error('no submodule in .gitmodules points at markup-carve/carve')
}

function pinOf(engine) {
  if (!existsSync(engine.dir)) {
    return new Error(`no checkout at ${engine.dir} (set ${engine.name.replace('-', '_').toUpperCase()}_DIR)`)
  }
  const worktree = ref === 'worktree'
  const at = worktree ? 'the index' : ref
  if (doFetch) {
    try {
      execFileSync('git', ['-C', engine.dir, 'fetch', '--quiet', 'origin', 'main'], { stdio: 'ignore' })
    } catch {
      fetchFailed.push(engine.name)
    }
  }
  try {
    const path = specSubmodulePath(engine.dir, worktree ? 'worktree' : ref)
    // `worktree` reads the INDEX, not HEAD. The index is what `git submodule
    // update` writes and what a `git add` of a bumped pin stages, so it is the
    // reading that answers "what is this checkout about to pin", which is the
    // question `--ref worktree` is asked.
    const line = worktree
      ? execFileSync('git', ['-C', engine.dir, 'ls-files', '-s', '--', path], { encoding: 'utf8' })
      : execFileSync('git', ['-C', engine.dir, 'ls-tree', ref, '--', path], { encoding: 'utf8' })
    const sha = (line.match(/^160000 (?:commit )?([0-9a-f]{40})[ \t]/) ?? [])[1]
    if (!sha) return new Error(`no submodule gitlink at '${path}' in ${at}`)
    return { sha, path }
  } catch (error) {
    return new Error(`${at} unreadable in ${engine.dir}: ${String(error.message).split('\n')[0]}`)
  }
}

/* -------------------------------------------------------------- exemption */

// Overridable so a test can hand the check an exemption file of its own instead
// of writing to the repository's, which a concurrent test run would see.
const EXEMPT_FILE = process.env.FLEET_PIN_EXEMPT_FILE ?? join(repoRoot, '.fleet-pin-exempt')
const EXEMPT_NAME = process.env.FLEET_PIN_EXEMPT_FILE ? EXEMPT_FILE : '.fleet-pin-exempt'

function exemptions() {
  if (!existsSync(EXEMPT_FILE)) return { rows: [], errors: [] }
  const rows = []
  const errors = []
  const seen = new Set()
  const lines = readFileSync(EXEMPT_FILE, 'utf8').split('\n')
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^([a-z0-9-]+)@([0-9a-f]{7,40})\s*:\s*(\S.*)$/)
    if (!match) {
      errors.push(`${EXEMPT_NAME}:${i + 1}: expected \`<repo>@<sha>: <reason>\`, got \`${line}\``)
      continue
    }
    const [, repo, sha, reason] = match
    if (!ENGINES.some((e) => e.name === repo)) {
      errors.push(`${EXEMPT_NAME}:${i + 1}: '${repo}' is not one of ${ENGINES.map((e) => e.name).join(', ')}`)
      continue
    }
    if (seen.has(repo)) {
      errors.push(`${EXEMPT_NAME}:${i + 1}: '${repo}' is listed twice, so one of the two reasons is silently discarded`)
      continue
    }
    seen.add(repo)
    rows.push({ repo, sha, reason, line: i + 1 })
  }
  return { rows, errors }
}

/* ----------------------------------------------------------------- report */

const short = (sha) => sha.slice(0, 8)
const pad = (s, n) => String(s).padEnd(n)

const measured = ENGINES.map((engine) => ({ ...engine, pin: pinOf(engine) }))
const { rows: exempt, errors: exemptErrors } = exemptions()

let failed = 0
const say = (s = '') => console.log(s)

say(`FLEET SPEC PIN CHECK - engines at ${ref}, distances against ${tipRef} (${short(tip)})`)
say()

for (const error of exemptErrors) {
  say(`  [FAIL] ${error}`)
  failed += 1
}
if (exemptErrors.length > 0) say()

for (const name of fetchFailed) {
  say(
    `  [FAIL] could not fetch origin/main in ${name} - its remote-tracking ref may name a pin ` +
      'that engine no longer has, so the fleet was read from a cache. Fix the network, or pass ' +
      '--no-fetch and say in the release notes that the verdict is from local refs.',
  )
  failed += 1
}
if (fetchFailed.length > 0) say()

const width = Math.max(...measured.map((m) => m.name.length))
const readable = []

for (const m of measured) {
  if (m.pin instanceof Error) {
    say(`  [FAIL] ${pad(m.name, width)}  UNREADABLE  ${m.pin.message}`)
    failed += 1
    continue
  }
  const info = describe(m.pin.sha)
  if (!info) {
    say(`  [FAIL] ${pad(m.name, width)}  ${short(m.pin.sha)}  not a commit in this repository - fetch, or fix the pin`)
    failed += 1
    continue
  }
  let behind
  try {
    behind = countBetween(m.pin.sha, tip)
  } catch {
    behind = null
  }
  const onMain = (() => {
    try {
      execFileSync('git', ['-C', repoRoot, 'merge-base', '--is-ancestor', m.pin.sha, tip], { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  })()
  if (!onMain) {
    say(`  [FAIL] ${pad(m.name, width)}  ${short(m.pin.sha)}  NOT reachable from ${tipRef} - run scripts/check-spec-pin-ancestry.sh there`)
    failed += 1
    continue
  }
  readable.push({ ...m, sha: m.pin.sha, path: m.pin.path, behind, info })
  say(`         ${pad(m.name, width)}  ${short(m.pin.sha)}  ${info.date}  ${behind} behind ${tipRef}  (${m.pin.path})`)
}
say()

const exemptFor = new Map(exempt.map((row) => [row.repo, row]))
const applied = []

for (const row of exempt) {
  const engine = readable.find((m) => m.name === row.repo)
  if (!engine) {
    say(`  [FAIL] .fleet-pin-exempt:${row.line}: ${row.repo} could not be measured, so the exemption cannot be judged`)
    failed += 1
    continue
  }
  if (!engine.sha.startsWith(row.sha)) {
    say(
      `  [FAIL] .fleet-pin-exempt:${row.line}: ${row.repo} is pinned at ${short(engine.sha)}, ` +
        `not ${row.sha} - the pin moved, so renew the line or delete it`,
    )
    failed += 1
    continue
  }
  const others = readable.filter((m) => m.name !== row.repo && !exemptFor.has(m.name))
  if (others.length > 0 && others.every((m) => m.sha === engine.sha)) {
    say(
      `  [FAIL] .fleet-pin-exempt:${row.line}: ${row.repo} agrees with the rest of the fleet at ` +
        `${short(engine.sha)} - the divergence this line declares is gone, delete it`,
    )
    failed += 1
    continue
  }
  applied.push({ row, engine })
}

const judged = readable.filter((m) => !applied.some((a) => a.engine.name === m.name))

if (readable.length === measured.length && judged.length < 2) {
  say(
    `  [FAIL] ${judged.length} engine(s) left after exemptions - a fleet verdict needs at least two, ` +
      'so nothing was compared',
  )
  failed += 1
} else if (judged.length >= 2) {
  const pins = new Set(judged.map((m) => m.sha))
  if (pins.size === 1 && readable.length < measured.length) {
    // NOT an [ok]. The engines that could be read agree, and the one that could
    // not is exactly where a divergence would sit. Saying "ok" here is the
    // sentence this whole gate exists because someone believed.
    say(`         ${judged.map((m) => m.name).join(', ')} agree at ${short(judged[0].sha)}, but the fleet was not fully read`)
  } else if (pins.size === 1) {
    say(`  [ok]   ${judged.map((m) => m.name).join(', ')} all pin ${short(judged[0].sha)}`)
  } else {
    const newest = judged.reduce((a, b) => (a.behind <= b.behind ? a : b))
    say('  [FAIL] the engines do not implement the same spec:')
    for (const m of judged) {
      const gap = m.sha === newest.sha ? 'the newest pin' : `${countBetween(m.sha, newest.sha)} behind ${newest.name}`
      say(`           ${pad(m.name, width)}  ${short(m.sha)}  ${m.info.date}  ${gap}`)
      say(`           ${pad('', width)}            ${m.info.subject}`)
    }
    say()
    say('         Move every engine to one spec commit before tagging, or declare the')
    say('         divergence in .fleet-pin-exempt with the reason it is deliberate.')
    failed += 1
  }
}

if (applied.length > 0) {
  say()
  say('EXEMPT - divergence declared deliberate:')
  for (const { row, engine } of applied) {
    say(`  ${row.repo} at ${short(engine.sha)} (${engine.behind} behind ${tipRef}): ${row.reason}`)
  }
}

say()
if (failed > 0) {
  say(`FLEET SPEC PIN CHECK FAILED - ${failed} finding(s). Not clear to tag.`)
  process.exit(1)
}
say('FLEET SPEC PIN CHECK PASSED - every judged engine pins the same spec commit.')
