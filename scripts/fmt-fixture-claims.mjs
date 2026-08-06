/*
 * The canonical form is canonical in EVERY engine, not just the pinned one.
 *
 * PART 11 is normative and quantifies over writers: "the canonical writer
 * (`carve fmt`, the `carve` render target) serializes a document back to Carve
 * source". A `tests/corpus/<slug>.fmt` file is what that sentence means for one
 * document - the exact source every conforming writer must produce for it.
 *
 * `tests/corpus-fmt-roundtrip.test.mjs` reads those fixtures through the single
 * `@markup-carve/carve` build `package.json` pins, so it answers "does carve-js
 * write this canonical form" while the rule binds every writer. Any writer
 * defect that spares carve-js is invisible to it (carve#841).
 *
 * That was not hypothetical. At carve-php `ef28bbf` - its tip when carve#841 was
 * filed - `fmt` on corpus 228 hoisted a footnote definition out of the list item
 * that held it:
 *
 *     - a
 *       [^f]: x
 *       more
 *
 *     see[^f]
 *
 * came back as
 *
 *     - a
 *       more
 *
 *     see[^f]
 *
 *     [^f]: x
 *
 * carve-js and carve-rs were right, the pinned gate checked carve-js, and the
 * document had no `.fmt` fixture to check anyway. (carve-php#886 has since fixed
 * the writer; this file is proved against `ef28bbf` for that reason.)
 *
 * WHAT THIS ASSERTS, and why BYTES rather than properties.
 * `scripts/degradation-claims.mjs` deliberately asserts properties, because
 * carve-rs satisfies a row of `docs/graceful-degradation.md` through a different
 * mechanism and a byte comparison would report that agreement as a failure. The
 * opposite is true here. PART 11 §1's invariants - `parse(fmt(x)) == parse(x)`
 * and `fmt(fmt(x)) == fmt(x)` - are the semantic ones, they admit exactly that
 * latitude in spelling, and they are ALREADY gated across all three engines by
 * `compare:impls --roundtrip --fail-on-diff` in this same workflow. A `.fmt`
 * fixture exists for the remaining question: which of several spellings that all
 * satisfy §1 is the canonical one. For that question the bytes ARE the property,
 * and there is nothing weaker to assert instead.
 *
 * Needs the sibling engines, so it runs in the conformance workflow rather than
 * in `npm test`. Without them it exits 2 rather than 0: a checker that reports
 * success having run nothing is the failure it exists to prevent.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustDir } from './lib/engine-locations.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')
const corpusDir = resolve(root, 'tests/corpus')

const fixtures = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.fmt'))
  .sort()
  .map((f) => {
    const slug = f.replace(/\.fmt$/, '')

    return {
      slug,
      source: resolve(corpusDir, `${slug}.crv`),
      expected: readFileSync(resolve(corpusDir, f), 'utf8'),
    }
  })

// A glob that quietly matches nothing is the failure mode these fixtures were
// already in for a whole release (carve#671): the files existed and were read by
// nothing. Reporting "0/0 canonical forms hold" as success would put them back
// there, so too few fixtures is an error, not a clean run.
if (fixtures.length < 5) {
  console.error(`fmt-fixture-claims: found ${fixtures.length} .fmt fixture(s) under tests/corpus.`)
  console.error('That is too few to be a real run - check the corpus path rather than trusting this result.')
  process.exit(2)
}

const missingSource = fixtures.filter((f) => !existsSync(f.source))
if (missingSource.length > 0) {
  console.error(`fmt-fixture-claims: ${missingSource.length} fixture(s) have no .crv beside them:`)
  for (const f of missingSource) console.error(`  ${f.slug}`)
  process.exit(2)
}

const engines = []
if (existsSync(join(jsDir, 'dist/index.js'))) engines.push({ name: 'js', kind: 'js', dir: jsDir })
for (const candidate of ['target/release/carve', 'target/debug/carve']) {
  const dir = rustDir()
  if (dir && existsSync(join(dir, candidate))) {
    engines.push({ name: 'rs', kind: 'cli', bin: join(dir, candidate), args: ['--carve'] })
    break
  }
}
if (phpDir() && existsSync(join(phpDir(), 'bin/carve'))) {
  engines.push({ name: 'php', kind: 'cli', bin: join(phpDir(), 'bin/carve'), args: ['--carve'] })
}

if (engines.length < 3) {
  console.error(
    `fmt-fixture-claims: need all three engines, found ${engines.length} (${engines.map((e) => e.name).join(', ') || 'none'}).`,
  )
  console.error('A checker that reports success having run nothing is the failure it exists to prevent.')
  process.exit(2)
}

const lib = await import(join(jsDir, 'dist/index.js'))

/**
 * The writer's output, UNTRIMMED. A canonical form is bytes, and the trailing
 * newline is one of them: trimming here would let a writer that drops it pass,
 * and a `.fmt` fixture is the only place in the repo that can say otherwise.
 */
function format(engine, file) {
  if (engine.kind === 'js') return lib.carveToCarve(readFileSync(file, 'utf8'))

  return execFileSync(engine.bin, [...engine.args, file], { encoding: 'utf8', maxBuffer: 1 << 26 })
}

let failures = 0
for (const fixture of fixtures) {
  const broken = []
  for (const engine of engines) {
    let actual
    try {
      actual = format(engine, fixture.source)
    } catch (error) {
      broken.push([engine.name, `did not run: ${error.message.split('\n')[0]}`])
      continue
    }
    if (actual !== fixture.expected) {
      broken.push([engine.name, `wrote ${JSON.stringify(actual)}`])
    }
  }

  if (broken.length === 0) {
    console.log(`ok   ${fixture.slug}`)
    continue
  }
  failures++
  console.log(`FAIL ${fixture.slug}`)
  console.log(`     canonical: ${JSON.stringify(fixture.expected)}`)
  for (const [name, reason] of broken) console.log(`     ${name}: ${reason}`)
}

console.log(
  `\n${fixtures.length - failures}/${fixtures.length} canonical forms hold in all ${engines.length} engines (${engines
    .map((e) => e.name)
    .join(', ')}).`,
)
if (failures > 0) {
  console.error(
    `${failures} document(s) where an engine's canonical writer disagrees with the pinned form (PART 11). ` +
      'Correct the engine, or the fixture.',
  )
  process.exit(1)
}
