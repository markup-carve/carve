/*
 * A tracked file must not carry the build machine's own directory layout.
 *
 * Every guard in this organization read TEXT, so a 65-repo sweep for host
 * paths passed this repository while docs/.vitepress/carve-wasm/carve_wasm_bg.wasm
 * - served to every visitor of the Playground page - held 30 strings naming
 * the maintainer's cargo home. Rust writes panic locations as absolute paths,
 * and a binary is where a text grep stops looking.
 *
 * So this guard reads bytes. It splits tracked files by whether they decode as
 * UTF-8 rather than by whether they contain a NUL: two deliberate conformance
 * fixtures here embed NUL bytes, and a NUL-based split would classify exactly
 * those as unreadable binary and skip them.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// A line that genuinely needs a host path carries this marker.
const ALLOW_MARKER = 'host-path-guard: intentional'

// Machines nobody owns: GitHub's Linux runners work under /home/runner, its
// macOS runners under /Users/runner.
const ALLOWED_USERS = new Set(['runner', 'vsts', 'vagrant'])

// Files whose host paths are the subject under test, and which are byte-pinned
// elsewhere so an inline marker cannot be added to them.
const ALLOWED_FILES = new Map([
  [
    'scripts/include-conformance-vectors.mjs',
    'builds the I07 vector asserting a resolver error leaks no path',
  ],
  [
    'tests/include-conformance/vectors/i07-resolver-throws-no-leak.json',
    'the I07 vector itself: the path must be present for the no-leak assertion to mean anything',
  ],
])

// Assembled from fragments so this file's own source carries no literal host
// path. The guard therefore still sees a leak committed HERE.
const SEP = '/'
const PATTERN = new RegExp(
  SEP + '(home|Users|media|mnt)' + SEP + '([A-Za-z0-9._-]+)' + SEP,
  'g',
)

function findHostPath(text) {
  for (const m of text.matchAll(PATTERN)) {
    if (!ALLOWED_USERS.has(m[2])) return m[0]
  }
  return ''
}

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8' })
  return out.split('\0').filter(Boolean)
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

// Printable runs of a non-text file, the way `strings` reads one.
function printableRuns(bytes) {
  const runs = []
  let run = ''
  for (const b of bytes) {
    if (b >= 0x20 && b < 0x7f) {
      run += String.fromCharCode(b)
    } else {
      if (run.length >= 4) runs.push(run)
      run = ''
    }
  }
  if (run.length >= 4) runs.push(run)
  return runs
}

test('no tracked file carries a host-rooted path', () => {
  const files = trackedFiles()
  assert.ok(files.length > 0, 'git ls-files listed nothing; the guard would pass by scanning nothing')

  const findings = []
  let binariesScanned = 0

  for (const file of files) {
    const full = resolve(repo, file)
    if (!existsSync(full)) continue
    if (ALLOWED_FILES.has(file)) continue

    const bytes = readFileSync(full)
    const text = decodeUtf8(bytes)

    if (text === null) {
      binariesScanned += 1
      for (const run of printableRuns(bytes)) {
        const hit = findHostPath(run)
        if (hit) {
          findings.push(`${file}: ${hit} (in binary contents)`)
          break
        }
      }
      continue
    }

    text.split('\n').forEach((line, i) => {
      if (line.includes(ALLOW_MARKER)) return
      const hit = findHostPath(line)
      if (hit) findings.push(`${file}:${i + 1}: ${hit}`)
    })
  }

  assert.ok(
    binariesScanned > 0,
    'no non-text tracked file was scanned; the binary arm of this guard did not run',
  )

  assert.deepEqual(
    findings,
    [],
    `tracked file(s) carry one machine's directory layout:\n  ${findings.join('\n  ')}\n\n` +
      `Resolve the path relatively, or take it from the environment. A binary ` +
      `artifact needs its generator fixed: scripts/sync-carve-wasm.mjs passes ` +
      `--remap-path-prefix so a rebuild stops embedding them. A line that ` +
      `genuinely needs a host path carries the marker "${ALLOW_MARKER}".`,
  )
})

test('every file-level exemption is still a file that still needs one', () => {
  for (const [file, reason] of ALLOWED_FILES) {
    const full = resolve(repo, file)
    assert.ok(existsSync(full), `exempted file no longer exists: ${file} (${reason})`)
    const bytes = readFileSync(full)
    const text = decodeUtf8(bytes) ?? printableRuns(bytes).join('\n')
    assert.ok(
      findHostPath(text),
      `${file} is exempted but holds no host path; drop the exemption (${reason})`,
    )
  }
})

test('the pattern catches and allows what it claims', () => {
  const s = '/'
  for (const caught of [
    `CARVE_RS=${s}media${s}someone${s}work${s}git${s}carve-rs`,
    `${s}home${s}dev${s}.cargo${s}registry${s}src${s}x.rs`,
    `${s}Users${s}jane${s}Projects${s}carve${s}`,
    `${s}mnt${s}data${s}build${s}`,
  ]) {
    assert.ok(findHostPath(caught), `pattern missed a host path: ${caught}`)
  }

  for (const allowed of [
    `${s}home${s}runner${s}work${s}carve${s}carve`,
    `${s}Users${s}runner${s}work${s}`,
    `${s}usr${s}local${s}bin${s}node`,
    `${s}cargo${s}git${s}checkouts${s}carve-rs-abc${s}da45f9d${s}src${s}parse.rs`,
    'docs/.vitepress/carve-wasm/carve_wasm.js',
  ]) {
    assert.equal(findHostPath(allowed), '', `pattern wrongly flagged: ${allowed}`)
  }
})

test('the binary arm reads printable runs the way strings does', () => {
  const s = '/'
  const buried = Buffer.concat([
    Buffer.from([0x00, 0x01, 0xff]),
    Buffer.from(`${s}home${s}someone${s}.cargo${s}registry${s}src${s}a.rs`),
    Buffer.from([0x00]),
  ])
  assert.equal(decodeUtf8(buried), null, 'the fixture must not decode as UTF-8')
  const runs = printableRuns(buried)
  assert.ok(
    runs.some((run) => findHostPath(run)),
    'the binary arm did not find a host path planted in a non-text buffer',
  )
})
