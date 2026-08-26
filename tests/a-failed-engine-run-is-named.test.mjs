/*
 * AN ERROR IS NOT A DIFF, and until now the comparison could not say so.
 *
 * `compare:impls` counted a failed engine run into `errors=N`, pushed an
 * `ERROR:` string into the case's outputs, and printed nothing else. An
 * `ERROR:` string never equals a render, so the case also printed a DIFF line -
 * one that names every engine that RAN, not the ones that disagreed. The
 * summary therefore read `carve: compared=1356 diffs=4 errors=1` for a run in
 * which three of the four were a writer divergence and the fourth was one
 * engine failing to produce output at all, on a document all three write
 * identically (markup-carve/carve#1544).
 *
 * Naming it matters more here than for a fixture mismatch, which anyone can
 * reproduce by running the engine by hand. A failure can be a timeout or a
 * signal - properties of the machine the run happened on, gone by the time
 * anyone reads the log - so the reason and the ELAPSED time both have to be in
 * the line. `run()` reports a timeout as a null status with no stderr, which is
 * indistinguishable from a silent non-zero exit without the duration beside it.
 *
 * Driven with STUB engines rather than the real ones: the property under test
 * is what the runner prints when an engine fails, and no real engine fails on
 * demand. The rust stub refuses the `carve` target and renders anything else,
 * which is what makes the assertions below reachable at all - once by writing to
 * stderr and exiting non-zero, and once by taking a signal, which leaves
 * `spawnSync` with a null status, no error and no stderr.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseShard, selectShard } from '../scripts/lib/shard.mjs'
import { comparisonGateHasFailures } from '../scripts/lib/comparison-gate.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('a cross-implementation difference fails the round-trip comparison gate', () => {
  assert.equal(
    comparisonGateHasFailures({
      selectedMode: 0,
      crossImplementation: 1,
      invariants: 0,
      fixtureMismatches: 0,
      crossRead: 0,
    }),
    true,
  )
})

test('an entirely clean comparison passes the gate', () => {
  assert.equal(
    comparisonGateHasFailures({
      selectedMode: 0,
      crossImplementation: 0,
      invariants: 0,
      fixtureMismatches: 0,
      crossRead: 0,
    }),
    false,
  )
})

test('four formatter shards partition the corpus exactly once', () => {
  const corpus = Array.from({ length: 1384 }, (_, index) => index)
  const shards = Array.from({ length: 4 }, (_, index) =>
    selectShard(corpus, parseShard(`${index}/4`)),
  )
  assert.deepEqual(shards.map((shard) => shard.length), [346, 346, 346, 346])
  assert.deepEqual(shards.flat().sort((a, b) => a - b), corpus)
  assert.deepEqual(selectShard([1, 2, 3], parseShard()), [1, 2, 3])
})

test('invalid and empty formatter shards are rejected', () => {
  assert.throws(() => parseShard('4/4'), /INDEX must be between/)
  assert.throws(() => parseShard('0/0'), /TOTAL must be positive/)
  assert.throws(() => parseShard('one\/four'), /Use --shard/)
})

/** A shell stub at `path`, executable. */
const stub = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
}

/*
 * Three checkouts that behave like engines for one document.
 *
 * The CLI pair is a shell script each. carve-js is driven through its API, so
 * its stub is a `dist/index.js` exporting the five render entry points and a
 * `package.json` whose `build` script does nothing - `available()` runs
 * `prepare` before it probes.
 */
function plantEngines(dir, { rustFailsOnCarve }) {
  const rs = join(dir, 'rs')
  const php = join(dir, 'php')
  const js = join(dir, 'js')

  // The last argument that does not begin with `-` is the document; every
  // render flag this runner passes does.
  const pick = 'for a in "$@"; do case "$a" in -*) ;; *) f="$a";; esac; done'
  const refuse = {
    // Two ways to fail, because they leave different evidence behind.
    stderr: 'echo "stub refuses the carve target" >&2; exit 3',
    // No stderr, no exit status - `spawnSync` reports only `signal`, which is
    // the case that printed `exit status null` before the signal was kept.
    signal: 'kill -9 $$',
  }[rustFailsOnCarve] ?? null
  stub(
    join(rs, 'target/debug/carve'),
    refuse
      ? `case " $* " in *" --carve "*) ${refuse};; esac\n${pick}\ncat "$f"`
      : `${pick}\ncat "$f"`,
  )

  // carve-php is spawned as `php bin/carve ...`, so its stub is a PHP file and
  // not a shell script - a shell script handed to `php` prints its own source
  // and exits 0, which looks like a render that disagrees with the other two.
  mkdirSync(join(php, 'bin'), { recursive: true })
  writeFileSync(
    join(php, 'bin/carve'),
    [
      '<?php',
      '$file = null;',
      "foreach (array_slice($argv, 1) as $arg) { if (!str_starts_with($arg, '-')) { $file = $arg; } }",
      'echo file_get_contents($file);',
      '',
    ].join('\n'),
  )

  // carve-js is driven through its API, so its stub is a `dist/index.js`
  // exporting the five render entry points and a `package.json` whose `build`
  // script does nothing - `available()` runs `prepare` before it probes.
  mkdirSync(join(js, 'dist'), { recursive: true })
  writeFileSync(
    join(js, 'package.json'),
    JSON.stringify({ name: 'stub', private: true, type: 'module', scripts: { build: 'node -e ""' } }) + '\n',
  )
  writeFileSync(
    join(js, 'dist/index.js'),
    [
      'const same = (s) => s',
      'export const carveToHtml = same',
      'export const carveToMarkdown = same',
      'export const carveToPlainText = same',
      'export const carveToCarve = same',
      'export const carveToAnsi = same',
      '',
    ].join('\n'),
  )

  return { rs, php, js }
}

function compare(dir, { rustFailsOnCarve }) {
  const { rs, php, js } = plantEngines(dir, { rustFailsOnCarve })

  return spawnSync(
    process.execPath,
    [join(root, 'scripts/compare-impls.mjs'), '--limit=1', '--targets=carve'],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        CARVE_RS_DIR: rs,
        CARVE_PHP_DIR: php,
        CARVE_JS_DIR: js,
        CARGO_TARGET_DIR: '',
      },
    },
  )
}

test('a failed engine run prints an ERROR line naming the document, the engine and why', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-error-naming-'))
  try {
    const run = compare(dir, { rustFailsOnCarve: 'stderr' })
    const out = `${run.stdout}${run.stderr}`
    const line = out.split('\n').find((l) => l.startsWith('ERROR [carve]'))
    assert.ok(line, `no ERROR line in:\n${out}`)
    assert.match(line, /^ERROR \[carve\] \S+ \(rust\) after \d+ms: stub refuses the carve target$/)
    // The count still moves, so the line and the summary cannot drift apart.
    assert.match(out, /carve: compared=1 diffs=1 errors=1/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('an engine killed by a signal is named by the signal, not by a null status', () => {
  // The failure mode with no other witness. `spawnSync` gives a signal-killed
  // process `status: null`, no `error` and no stderr, so every other field the
  // reason falls back through is empty - an OOM kill or a stack overflow read
  // as `exit status null` until the signal was carried out of `run()`.
  const dir = mkdtempSync(join(tmpdir(), 'carve-error-naming-signal-'))
  try {
    const run = compare(dir, { rustFailsOnCarve: 'signal' })
    const out = `${run.stdout}${run.stderr}`
    const line = out.split('\n').find((l) => l.startsWith('ERROR [carve]'))
    assert.ok(line, `no ERROR line in:\n${out}`)
    assert.match(line, /^ERROR \[carve\] \S+ \(rust\) after \d+ms: killed by SIGKILL$/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a run where every engine answers prints no ERROR line', () => {
  // The control. Without it the assertion above passes for a runner that prints
  // an ERROR line unconditionally, which is the shape this repo keeps finding.
  const dir = mkdtempSync(join(tmpdir(), 'carve-error-naming-clean-'))
  try {
    const run = compare(dir, { rustFailsOnCarve: null })
    const out = `${run.stdout}${run.stderr}`
    assert.equal(
      out.split('\n').filter((l) => l.startsWith('ERROR [')).length,
      0,
      `an ERROR line with nothing failing:\n${out}`,
    )
    assert.match(out, /carve: compared=1 diffs=0 errors=0/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
