/*
 * THE THREE-ENGINE PUBLISHED-SHAPE TABLE, in one command.
 *
 * WHY THIS EXISTS. Twice in one day a cross-engine shape table was built from
 * carve-js's PARSE-ONLY tree and compared against carve-rs and carve-php, which
 * resolve inside their own parse. carve-js is the only engine that exposes a
 * pre-resolve stage, so `parse()` is a stage the others do not have - and the
 * difference gets reported as the satellites'. It cost a ruling that had to be
 * withdrawn (carve#1663) and a premise test that described carve-js rather than
 * the language (carve#1660, whose engine half is carve-js#1437).
 *
 * `scripts/ast-conformance.mjs` has named that trap in its own source since
 * carve#486 and takes its reference tree through `toAstJson(resolve(parse(x)))`.
 * That comment could not help either author, because neither was editing the
 * harness: one was writing a test helper, the other a scratch probe. So the fix
 * is not another comment in the harness - it is making the CORRECT table cheaper
 * to produce than a wrong one.
 *
 *   node scripts/shape-table.mjs '![a][r]
 *
 *   [r]: u'
 *   printf '%s' "$SOURCE" | node scripts/shape-table.mjs
 *
 * Every engine is read through its PUBLISHED exit - the tree a consumer
 * receives - and the verdict comes from the same `classifyShapeDisagreement`
 * the conformance panel uses, so a table from here and a line from
 * `npm run ast:check` cannot disagree.
 *
 * IT REFUSES RATHER THAN GUESSES. Two engines are not a majority, so a run that
 * cannot reach all three prints what is missing and exits non-zero instead of a
 * table someone will paste into a ticket. That is the same rule the panel
 * follows, and the reason it exists: a two-engine "agreement" reads exactly like
 * a three-engine one.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

import { classifyShapeDisagreement, shapeOf, shapePaths } from './spec/ast-shape.mjs'
import { phpDir, rustBinaryCandidates, rustDir } from './lib/engine-locations.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolvePath(here, '..')

const MAX_OUTPUT = 64 * 1024 * 1024

function readSource() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  if (args.length > 0) return args[0].endsWith('\n') ? args[0] : args[0] + '\n'
  const stdin = readFileSync(0, 'utf8')
  if (stdin === '') {
    console.error('shape-table: no source. Pass it as an argument or on stdin.')
    process.exit(2)
  }

  return stdin.endsWith('\n') ? stdin : stdin + '\n'
}

/*
 * carve-js, through the SAME expression ast-conformance.mjs uses.
 *
 * `resolve()` is where a reference becomes a link or degrades, and it MUTATES
 * the tree in place - so `parse(x)` alone is not merely a smaller answer, it is
 * a different stage, and reading `parse(x).children` after calling `resolve` on
 * it reports the resolved shape while looking like the parse one. Both traps
 * are avoided by never holding the parse tree at all.
 */
function jsTree(source) {
  const dir = process.env.CARVE_JS_DIR ?? resolvePath(root, '../carve-js')
  const entry = resolvePath(dir, 'dist/index.js')
  if (!existsSync(entry)) return { missing: `carve-js: no build at ${entry}` }

  return { entry, source }
}

async function jsShape(source) {
  const probe = jsTree(source)
  if (probe.missing) return probe
  const lib = await import(probe.entry)
  if (typeof lib.carveToAstJson !== 'function') {
    return { missing: 'carve-js: build exposes no carveToAstJson' }
  }

  // The published one-shot exit. It is `toAstJson(resolve(parse(x)))` inside,
  // which is exactly what the conformance harness composes by hand.
  return { doc: lib.carveToAstJson(source) }
}

function spawnShape(label, bin, args, opts) {
  try {
    return { doc: JSON.parse(execFileSync(bin, args, { ...opts, encoding: 'utf8', maxBuffer: MAX_OUTPUT, stdio: ['pipe', 'pipe', 'pipe'] })) }
  } catch (error) {
    return { missing: `${label}: ${String(error.message).split('\n')[0]}` }
  }
}

function rsShape(source) {
  const bin = rustBinaryCandidates(rustDir()).find((c) => existsSync(c))
  if (!bin) return { missing: 'carve-rs: no built binary (set CARVE_RS_DIR / CARGO_TARGET_DIR)' }

  return spawnShape('carve-rs', bin, ['--json'], { input: source })
}

function phpShape(source) {
  const dir = phpDir()
  if (!existsSync(resolvePath(dir, 'bin/carve'))) {
    return { missing: `carve-php: no bin/carve under ${dir} (set CARVE_PHP_DIR)` }
  }

  return spawnShape('carve-php', 'php', ['bin/carve', '--json'], { cwd: dir, input: source })
}

const source = readSource()
const results = [
  ['carve-js', await jsShape(source)],
  ['carve-rs', rsShape(source)],
  ['carve-php', phpShape(source)],
]

const missing = results.filter(([, r]) => r.missing)
if (missing.length > 0) {
  console.error('THREE-ENGINE TABLE NOT PRODUCED - a majority needs all three engines.\n')
  for (const [, r] of missing) console.error(`  ${r.missing}`)
  console.error('\nTwo engines agreeing reads exactly like three agreeing, so no table is')
  console.error('printed. This is not a pass.')
  process.exit(1)
}

const topLevel = (doc) => (doc.children ?? []).map((c) => c.type).join(' + ') || '(empty)'
const signatures = results.map(([engine, r]) => [engine, shapePaths(shapeOf(r.doc)).join('\n')])
const verdict = classifyShapeDisagreement(signatures)

console.log('SOURCE')
for (const line of source.replace(/\n$/, '').split('\n')) console.log('  | ' + line)
console.log('\nPUBLISHED TOP-LEVEL SHAPE (the tree a consumer receives)\n')
const width = Math.max(...results.map(([e]) => e.length))
for (const [engine, r] of results) console.log(`  ${engine.padEnd(width)}  ${topLevel(r.doc)}`)

console.log('')
if (verdict.kind === 'unanimous') console.log('VERDICT: unanimous - the three engines publish the same shape.')
else if (verdict.kind === 'alone') console.log(`VERDICT: ${verdict.engine} stands alone.`)
else console.log('VERDICT: all three differ.')

if (verdict.kind !== 'unanimous') {
  console.log('\nFULL SIGNATURES')
  for (const [engine, sig] of signatures) {
    console.log(`\n  ${engine}`)
    for (const line of sig.split('\n')) console.log('    ' + line)
  }
}

console.log(
  '\nRead through each engine\'s PUBLISHED exit: carve-js carveToAstJson(), ' +
    'carve-rs and\ncarve-php `--json`. Quote that when pasting this into a ticket - ' +
    'a table built from\ncarve-js parse() compares a stage no other engine exposes (carve#486).',
)
