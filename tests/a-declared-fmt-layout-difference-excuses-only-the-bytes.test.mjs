/*
 * resources/engine-fmt-layout.txt excuses one thing: two engines writing a
 * row's `fmt` output in different bytes (carve-js#3310). The round-trip HTML
 * comparison, the PART 11 §1 invariants and the cross-read stay strict, and a
 * line whose engines agree again fails the run.
 *
 * Driven with stub engines over a one-row corpus, like
 * a-diff-line-names-which-engines-disagreed.test.mjs. The stubs render HTML
 * identically and differ only in the comment line their `--carve` output
 * appends, which is a layout difference by construction.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  fmtLayoutStaleBlocker,
  judgeFmtLayout,
  parseFmtLayoutLedger,
  staleFmtLayout,
} from '../scripts/lib/drift-ledger.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SLUG = '001-a'
const REF = 'markup-carve/carve-js#3310'

/*
 * `fmt` = the source without comment or blank lines, plus `%% <tag>`, so it is
 * idempotent; every other target drops the comment lines, so `tag` never
 * reaches the HTML unless `htmlTag` puts it there.
 */
function plantEngines(dir, tags, htmlTag = {}) {
  const rs = join(dir, 'rs')
  mkdirSync(join(rs, 'target/debug'), { recursive: true })
  writeFileSync(
    join(rs, 'target/debug/carve'),
    [
      '#!/bin/sh',
      'carve=0; for a in "$@"; do case "$a" in --carve) carve=1;; -*) ;; *) f="$a";; esac; done',
      `if [ $carve = 1 ]; then sed '/^%%/d;/^$/d' "$f"; printf '\\n%%%% %s\\n' '${tags.rust}'; else sed '/^%%/d' "$f"; printf '%s' '${htmlTag.rust ?? ''}'; fi`,
      '',
    ].join('\n'),
  )
  chmodSync(join(rs, 'target/debug/carve'), 0o755)

  const php = join(dir, 'php')
  mkdirSync(join(php, 'bin'), { recursive: true })
  writeFileSync(
    join(php, 'bin/carve'),
    [
      '<?php',
      '$file = null; $carve = false;',
      "foreach (array_slice($argv, 1) as $arg) { if ($arg === '--carve') { $carve = true; } elseif (!str_starts_with($arg, '-')) { $file = $arg; } }",
      '$lines = explode("\\n", file_get_contents($file));',
      "$keep = array_filter($lines, fn ($l) => !str_starts_with($l, '%%') && (!$carve || $l !== ''));",
      `echo $carve ? implode("\\n", $keep) . "\\n\\n%% " . ${JSON.stringify(tags.php)} . "\\n" : implode("\\n", $keep) . ${JSON.stringify(htmlTag.php ?? '')};`,
      '',
    ].join('\n'),
  )

  const js = join(dir, 'js')
  mkdirSync(join(js, 'dist'), { recursive: true })
  writeFileSync(
    join(js, 'package.json'),
    JSON.stringify({ name: 'stub', private: true, type: 'module', scripts: { build: 'node -e ""' } }) + '\n',
  )
  writeFileSync(
    join(js, 'dist/index.js'),
    [
      "const keep = (s, blank) => s.split('\\n').filter((l) => !l.startsWith('%%') && (!blank || l !== '')).join('\\n')",
      `const r = (s) => keep(s, false) + ${JSON.stringify(htmlTag.js ?? '')}`,
      'export const carveToHtml = r',
      'export const carveToMarkdown = r',
      'export const carveToPlainText = r',
      'export const carveToAnsi = r',
      `export const carveToCarve = (s) => keep(s, true) + '\\n\\n%% ' + ${JSON.stringify(tags.js)} + '\\n'`,
      '',
    ].join('\n'),
  )
  return { rs, php, js }
}

/** Commit a stub checkout so it has a HEAD the pins file can name. */
function commitStub(dir) {
  const git = (...args) => spawnSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'stub', GIT_AUTHOR_EMAIL: 'stub@example.invalid', GIT_COMMITTER_NAME: 'stub', GIT_COMMITTER_EMAIL: 'stub@example.invalid' },
  })
  git('init', '-q')
  git('add', '-A')
  git('commit', '-q', '-m', 'stub')
  return git('rev-parse', 'HEAD').stdout.trim()
}

function compare({ tags, htmlTag, ledger, atPins = true }) {
  const dir = mkdtempSync(join(tmpdir(), 'carve-fmt-layout-'))
  try {
    const engines = plantEngines(dir, tags, htmlTag)
    const corpus = join(dir, 'corpus')
    mkdirSync(corpus)
    writeFileSync(join(corpus, `${SLUG}.crv`), 'para\n')
    writeFileSync(join(corpus, `${SLUG}.html`), 'para\n')
    const ledgerPath = join(dir, 'engine-fmt-layout.txt')
    writeFileSync(ledgerPath, `# test ledger\n${ledger.join('\n')}\n`)
    const pins = { js: commitStub(engines.js), php: commitStub(engines.php), rs: commitStub(engines.rs) }
    if (!atPins) pins.rs = '0'.repeat(40)
    const pinsPath = join(dir, 'engine-pins.json')
    writeFileSync(pinsPath, `${JSON.stringify({ engines: pins })}\n`)
    const run = spawnSync(
      process.execPath,
      [join(root, 'scripts/compare-impls.mjs'), '--roundtrip', '--fail-on-diff', `--corpus-dir=${corpus}`],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          CARVE_RS_DIR: engines.rs,
          CARVE_PHP_DIR: engines.php,
          CARVE_JS_DIR: engines.js,
          CARGO_TARGET_DIR: '',
          CARVE_FMT_LAYOUT_LEDGER: ledgerPath,
          CARVE_ENGINE_PINS_FILE: pinsPath,
        },
      },
    )
    return { status: run.status, out: `${run.stdout}${run.stderr}` }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const LAYOUT = { rust: 'r', php: 'r', js: 'j' }
const BOTH_PAIRS = [`js|php/${SLUG}  layout (${REF})`, `js|rust/${SLUG}  layout (${REF})`]

test('an undeclared fmt byte difference fails the round-trip gate', () => {
  const { status, out } = compare({ tags: LAYOUT, ledger: [] })
  assert.equal(status, 1, out)
  assert.match(out, new RegExp(`^DIFF \\[carve\\] ${SLUG} \\(core\\): rust\\+php \\| js$`, 'm'))
  // The control on the stubs: nothing else is wrong with the row.
  assert.doesNotMatch(out, /ROUNDTRIP DIFF|INVARIANT|CROSS-READ/)
})

test('the same difference passes once every disagreeing pair is declared', () => {
  const { status, out } = compare({ tags: LAYOUT, ledger: BOTH_PAIRS })
  assert.equal(status, 0, out)
  assert.match(out, new RegExp(`^DECLARED \\[carve\\] ${SLUG} `, 'm'))
  assert.match(out, /fmt_layout_declared=1 fmt_layout_stale=0/)
  assert.doesNotMatch(out, /^DIFF /m)
})

test('one undeclared pair keeps the row red', () => {
  const { status, out } = compare({ tags: LAYOUT, ledger: [BOTH_PAIRS[1]] })
  assert.equal(status, 1, out)
  assert.match(out, /^DIFF \[carve\]/m)
})

test('a declared line whose engines agree again fails as stale', () => {
  const { status, out } = compare({ tags: { rust: 'r', php: 'r', js: 'r' }, ledger: BOTH_PAIRS })
  assert.equal(status, 1, out)
  assert.match(out, /STALE fmt layout js\|php\/001-a: js and php now write the same bytes/)
  assert.match(out, /STALE fmt layout js\|rust\/001-a/)
})

test('away from the engine pins a line is not judged stale, and says so', () => {
  // The per-PR formatter job runs the engines' latest releases, not the pins
  // the rows were measured at, so agreement there proves nothing about them.
  const { status, out } = compare({ tags: { rust: 'r', php: 'r', js: 'r' }, ledger: BOTH_PAIRS, atPins: false })
  assert.equal(status, 0, out)
  assert.match(out, /fmt layout lines not judged stale: engines not at resources\/engine-pins.json: rust=/)
  assert.doesNotMatch(out, /STALE fmt layout/)
})

test('the pin check names every engine off its pin', () => {
  const pins = { js: 'a'.repeat(40), php: 'b'.repeat(40), rs: 'c'.repeat(40) }
  const at = { engines: { rust: { head: pins.rs }, js: { head: pins.js }, php: { head: pins.php } } }
  assert.equal(fmtLayoutStaleBlocker(at, pins), null)
  const off = { engines: { ...at.engines, php: { head: 'd'.repeat(40) }, js: { head: null } } }
  assert.match(fmtLayoutStaleBlocker(off, pins), /js=unknown .* php=dddddddddddd/)
})

test('a declaration does not excuse a difference in the HTML of the formatted output', () => {
  const { status, out } = compare({ tags: LAYOUT, htmlTag: { js: ' x' }, ledger: BOTH_PAIRS })
  assert.equal(status, 1, out)
  assert.match(out, /ROUNDTRIP DIFF 001-a/)
})

test('the ledger parser refuses an unordered pair, a missing ticket and a duplicate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-fmt-layout-parse-'))
  try {
    const path = join(dir, 'l.txt')
    writeFileSync(
      path,
      [
        `rust|js/${SLUG}  backwards (${REF})`,
        `js|rust/${SLUG}  no ticket here`,
        `js|php/${SLUG}  fine (${REF})`,
        `js|php/${SLUG}  again (${REF})`,
        `php|rust/${SLUG}  fine (${REF})`,
        '',
      ].join('\n'),
    )
    const { entries, failures } = parseFmtLayoutLedger(path)
    assert.deepEqual([...entries.keys()], [`js|php/${SLUG}`, `php|rust/${SLUG}`])
    assert.equal(failures.length, 3, failures.join('\n'))
    assert.match(failures[0], /must be two of js, php, rust, in that order/)
    assert.match(failures[1], /fully qualified owner\/repo#N/)
    assert.match(failures[2], /duplicate entry/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('an errored engine is never excused and never called stale', () => {
  const entries = new Map([[`js|rust/${SLUG}`, { engines: ['js', 'rust'], slug: SLUG }]])
  assert.equal(judgeFmtLayout(SLUG, [['rust', 'a'], ['js', 'ERROR:boom']], entries).excused, false)
  assert.equal(judgeFmtLayout(SLUG, [['rust', 'a'], ['js', 'b']], entries).excused, true)
  const seen = new Map([[SLUG, new Map([['rust', 'a'], ['js', 'ERROR:boom']])]])
  assert.deepEqual(staleFmtLayout(entries, seen, new Set([SLUG])), [])
  // A row the run did not reach says nothing; a row the corpus lacks is stale.
  assert.deepEqual(staleFmtLayout(entries, new Map(), new Set([SLUG])), [])
  assert.equal(staleFmtLayout(entries, new Map(), new Set()).length, 1)
})
