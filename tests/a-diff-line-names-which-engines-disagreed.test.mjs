/*
 * A DIFF LINE THAT NAMES THE PARTICIPANTS CANNOT NAME THE OUTLIER.
 *
 * `compare:impls` printed every engine that produced output, so a three-way
 * comparison read `rust, js, php` whether one engine was the outlier or all
 * three wrote something different. carve#1544 fixed that reading for the ERROR
 * line and left it here, and the cost came due in carve#2281: twelve
 * `rust, js, php` lines on the Markdown target were read as "no engine is the
 * odd one out and none can be used as the reference" and the ticket said so.
 * Two of the three agree on all twelve.
 *
 * Driven with STUB engines, like tests/a-failed-engine-run-is-named.test.mjs:
 * the property under test is what the runner PRINTS, and no real engine
 * diverges on demand. Two arms, because the assertion is about telling them
 * apart - one where two stubs agree against a third, one where all three
 * differ. Without the second arm a runner that always prints the participants
 * joined by `+` would pass the first.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The last argument that does not begin with `-` is the document; every render
// flag this runner passes does.
const PICK = 'for a in "$@"; do case "$a" in -*) ;; *) f="$a";; esac; done'

const shellStub = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
}

/*
 * Three checkouts that render one document each their own way.
 *
 * `suffix` is what each stub appends to the document, so "" makes a stub agree
 * with any other stub whose suffix is also "".
 */
function plantEngines(dir, { rust, php, js }) {
  const rs = join(dir, 'rs')
  const phpDir = join(dir, 'php')
  const jsDir = join(dir, 'js')

  shellStub(join(rs, 'target/debug/carve'), `${PICK}\ncat "$f"\nprintf '%s' '${rust}'`)

  // carve-php is spawned as `php bin/carve ...`, so its stub is a PHP file: a
  // shell script handed to `php` prints its own source and exits 0, which looks
  // like a render that disagrees with the other two for the wrong reason.
  mkdirSync(join(phpDir, 'bin'), { recursive: true })
  writeFileSync(
    join(phpDir, 'bin/carve'),
    [
      '<?php',
      '$file = null;',
      "foreach (array_slice($argv, 1) as $arg) { if (!str_starts_with($arg, '-')) { $file = $arg; } }",
      'echo file_get_contents($file);',
      `echo ${JSON.stringify(php)};`,
      '',
    ].join('\n'),
  )

  // carve-js is driven through its API, so its stub is a `dist/index.js`
  // exporting the five render entry points and a `package.json` whose `build`
  // script does nothing - `available()` runs `prepare` before it probes.
  mkdirSync(join(jsDir, 'dist'), { recursive: true })
  writeFileSync(
    join(jsDir, 'package.json'),
    JSON.stringify({ name: 'stub', private: true, type: 'module', scripts: { build: 'node -e ""' } }) + '\n',
  )
  const render = `const r = (s) => s + ${JSON.stringify(js)}`
  writeFileSync(
    join(jsDir, 'dist/index.js'),
    [
      render,
      'export const carveToHtml = r',
      'export const carveToMarkdown = r',
      'export const carveToPlainText = r',
      'export const carveToCarve = r',
      'export const carveToAnsi = r',
      '',
    ].join('\n'),
  )

  return { rs, php: phpDir, js: jsDir }
}

function diffLine(suffixes) {
  const dir = mkdtempSync(join(tmpdir(), 'carve-diff-partition-'))
  try {
    const { rs, php, js } = plantEngines(dir, suffixes)
    const run = spawnSync(
      process.execPath,
      [join(root, 'scripts/compare-impls.mjs'), '--limit=1', '--targets=carve'],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, CARVE_RS_DIR: rs, CARVE_PHP_DIR: php, CARVE_JS_DIR: js, CARGO_TARGET_DIR: '' },
      },
    )
    const out = `${run.stdout}${run.stderr}`
    const line = out.split('\n').find((l) => l.startsWith('DIFF [carve]'))
    return { line, out }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('a DIFF line groups the engines that wrote the same bytes', () => {
  // rust and php render identically; js appends a byte neither of them does.
  const { line, out } = diffLine({ rust: '', php: '', js: ' x' })
  assert.ok(line, `no DIFF line in:\n${out}`)
  assert.match(line, /^DIFF \[carve\] \S+ \([^)]*\): rust\+php \| js$/)
})

test('a DIFF line where every engine differs names each one alone', () => {
  // THE CONTROL. `rust+php | js` above is only evidence of a partition if a
  // three-way split prints differently; a runner that joined the participants
  // with `+` unconditionally would satisfy the assertion above.
  const { line, out } = diffLine({ rust: ' r', php: ' p', js: ' j' })
  assert.ok(line, `no DIFF line in:\n${out}`)
  assert.match(line, /^DIFF \[carve\] \S+ \([^)]*\): rust \| js \| php$/)
})

test('engines that agree print no DIFF line at all', () => {
  // The other control. Without it both assertions pass for a runner that prints
  // a DIFF line unconditionally, which is the shape this repo keeps finding.
  const { out } = diffLine({ rust: '', php: '', js: '' })
  assert.equal(
    out.split('\n').filter((l) => l.startsWith('DIFF [')).length,
    0,
    `a DIFF line with nothing diverging:\n${out}`,
  )
  assert.match(out, /carve: compared=1 diffs=0 errors=0/)
})
