/*
 * A CLEAN BILL FOR A CHECK THAT DID NOT RUN.
 *
 * `compare:impls` computes once and gates twice. The `--roundtrip` invocation
 * sets the fixture-mismatch total to 0 outright - that count belongs to the
 * default run and to `check-compare-report.mjs` reading the written report - and
 * its closing sentence claimed it anyway:
 *
 *   No round-trip differences, no fixture mismatches, no PART 11 §1 invariant
 *   failures, and no cross-read failures.
 *
 * Both formatter shards of the daily `AST conformance` run printed that and then
 * failed on the next step, where `compare:report` read the same report and found
 * the differences. A reader of the compare step alone called the shard clean
 * (markup-carve/carve#1802).
 *
 * markup-carve/carve#1804 closed the cross-implementation half by GATING that
 * count here rather than deferring it, which is why it is claimed. The fixture
 * half was left behind, and it is the same defect: the class
 * markup-carve/carve#755 catalogs, reached from the reporting side rather than
 * the gating side.
 *
 * Driven with STUB engines, reusing the shape
 * `a-failed-engine-run-is-named.test.mjs` established: the property under test is
 * what the runner PRINTS, and it must hold on a run where nothing is wrong -
 * which is exactly the run whose sentence was false.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Three checkouts that agree on every target, so no condition can fail. */
function plantEngines(dir) {
  const rs = join(dir, 'rs')
  const php = join(dir, 'php')
  const js = join(dir, 'js')

  const pick = 'for a in "$@"; do case "$a" in -*) ;; *) f="$a";; esac; done'
  mkdirSync(join(rs, 'target/debug'), { recursive: true })
  writeFileSync(join(rs, 'target/debug/carve'), `#!/bin/sh\n${pick}\ncat "$f"\n`)
  chmodSync(join(rs, 'target/debug/carve'), 0o755)

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

  mkdirSync(join(js, 'dist'), { recursive: true })
  writeFileSync(
    join(js, 'package.json'),
    JSON.stringify({ name: 'stub', private: true, type: 'module', scripts: { build: 'node -e ""' } }) +
      '\n',
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

function compare(dir, extraArgs) {
  const { rs, php, js } = plantEngines(dir)

  return spawnSync(
    process.execPath,
    // `--fail-on-diff` is what reaches the gate-and-summarize block at all.
    [
      join(root, 'scripts/compare-impls.mjs'),
      '--limit=1',
      '--targets=carve',
      '--fail-on-diff',
      ...extraArgs,
    ],
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

test('the roundtrip run does not claim the fixture condition it zeroed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-summary-scope-roundtrip-'))
  try {
    const report = join(dir, 'report.json')
    const run = compare(dir, ['--roundtrip', `--report=${report}`])
    const out = `${run.stdout}${run.stderr}`

    // THE REGRESSION.
    assert.doesNotMatch(
      out,
      /no fixture mismatches/,
      `the roundtrip summary still claims a condition it zeroed:\n${out}`,
    )

    // What it may claim: the three it actually gated, cross-implementation
    // among them since carve#1804 started gating that count here.
    assert.match(
      out,
      /No round-trip or cross-implementation differences, no PART 11 §1 invariant failures, and no cross-read failures\./,
    )

    // NAMED, not merely dropped: the reader is pointed at the gate that owns it.
    assert.match(out, /NOT checked here: fixture mismatches\./)
    assert.ok(out.includes(report), `the summary does not name the report path:\n${out}`)
    assert.match(out, /compare:report/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('the default run still claims the fixture mismatches it does gate', () => {
  // The control. Without it the assertion above passes for a script that simply
  // stopped mentioning fixture mismatches in both modes - and the default run is
  // the one that owns that condition, so there it must still be claimed.
  const dir = mkdtempSync(join(tmpdir(), 'carve-summary-scope-default-'))
  try {
    const run = compare(dir, [])
    const out = `${run.stdout}${run.stderr}`
    assert.match(
      out,
      /No cross-implementation differences, no fixture mismatches, and no PART 11 §1 invariant failures\./,
    )
    assert.doesNotMatch(out, /NOT checked here/, `the default run defers nothing:\n${out}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
