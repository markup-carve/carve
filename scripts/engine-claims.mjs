/*
 * The grammar's cross-engine claims are real, and still real.
 *
 * resources/grammar.ebnf names specific engines and says what they do: "all
 * impls support it", "carve-rs is the reference here", "carve-php additionally
 * accepts colon-bearing keys". Those sentences are how a second implementer
 * learns where the margins are, and nothing checked any of them.
 *
 * They rot. PART 12 §4's implementation status described carve-rs as recording
 * block positions only - "869 block nodes and 54 left" - long after it placed
 * inline ones too, and pointed at two tracking issues that were both closed.
 * The math paragraph ended "carve-php currently DROPS valid math attributes --
 * to be fixed" long after carve-php stopped dropping them. Both were found by
 * reading, not by a gate.
 *
 * This runs the engines and pins each claim as an OBSERVABLE relation - do they
 * agree, or does one differ - rather than any engine's exact bytes, which the
 * corpus already pins. A claim that says "all three agree" fails here if one
 * drifts; a claim that documents a divergence fails here if it is silently
 * resolved, which is the direction that leaves a false sentence behind.
 *
 * Needs the sibling engines, so it runs in the conformance workflow rather than
 * in `npm test`. Without them it exits 2 rather than 0: a claim checker that
 * reports success having run nothing is the failure it exists to prevent.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustDir } from './lib/engine-locations.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')

/**
 * Every claim states the SECTION it comes from, so a failure names the sentence
 * to correct rather than leaving someone to find it.
 *
 * `expect` is 'agree' when the grammar says the engines behave alike, or a list
 * of engines that must differ from the rest.
 */
const CLAIMS = [
  {
    section: 'PART 3, math attributes',
    quote: 'an attribute block on a math span applies to the math element in every engine',
    source: '$`x`{.c}\n',
    expect: 'agree',
  },
  {
    section: 'PART 9 §14, attribute identifiers',
    quote: 'carve-php additionally accepts colon-bearing keys as spans, where carve-js treats those as literal',
    source: '[x]{xml:lang="en"}\n',
    expect: ['php'],
  },
  {
    section: 'PART 9 §14, attribute identifiers',
    quote: 'carve-php additionally accepts colon-bearing classes as spans, where carve-js treats those as literal',
    source: '[y]{.sm:hover}\n',
    expect: ['php'],
  },

  /*
   * PART 9 §15 A2a names a three-way divergence across five invisible
   * constructs, so it needs five claims: the split is PER KIND, and one case
   * would pin the shape of the disagreement wrong.
   *
   * THEY HAVE ALL MOVED TO A2a, and these five now pin the agreement instead.
   * That is the outcome this checker was built for: a documented divergence
   * that gets silently RESOLVED leaves a false sentence in the grammar, so the
   * five claims failed on the day the last engine came into line and the
   * failure said to rewrite the paragraph rather than relax the check
   * (carve#529 measured the divergence; carve#857 measured its end).
   *
   * They stay one claim per KIND rather than collapsing into one: the engines
   * disagreed per kind and none was self-consistent across all five, so a
   * single case would let four kinds regress unnoticed.
   */
  {
    section: 'PART 9 §15 A2a, floating attribute over a footnote definition',
    quote: 'every engine applies a floating attribute over a footnote definition',
    source: '{#i}\n[^f]: note\n\ne\n',
    expect: 'agree',
  },
  {
    section: 'PART 9 §15 A2a, floating attribute over a link reference definition',
    quote: 'every engine applies a floating attribute over a link reference definition',
    source: '{#i}\n[f]: u\n\ne\n',
    expect: 'agree',
  },
  {
    section: 'PART 9 §15 A2a, floating attribute over an abbreviation definition',
    quote: 'every engine applies a floating attribute over an abbreviation definition',
    source: '{#i}\n*[A]: b\n\ne\n',
    expect: 'agree',
  },
  {
    section: 'PART 9 §15 A2a, floating attribute over a line comment',
    quote: 'every engine applies a floating attribute over a line comment',
    source: '{#i}\n%% c\n\ne\n',
    expect: 'agree',
  },
  {
    section: 'PART 9 §15 A2a, floating attribute over a comment block',
    quote: 'every engine applies a floating attribute over a comment block',
    source: '{#i}\n%%%\nc\n%%%\n\ne\n',
    expect: 'agree',
  },
]

const engines = []
if (existsSync(join(jsDir, 'dist/index.js'))) engines.push({ name: 'js', kind: 'js', dir: jsDir })
for (const candidate of ['target/release/carve', 'target/debug/carve']) {
  const dir = rustDir()
  if (dir && existsSync(join(dir, candidate))) {
    engines.push({ name: 'rs', kind: 'cli', bin: join(dir, candidate) })
    break
  }
}
if (phpDir() && existsSync(join(phpDir(), 'bin/carve'))) {
  engines.push({ name: 'php', kind: 'cli', bin: join(phpDir(), 'bin/carve') })
}

if (engines.length < 3) {
  console.error(
    `engine-claims: need all three engines, found ${engines.length} (${engines.map((e) => e.name).join(', ') || 'none'}).`,
  )
  console.error('A claim checker that reports success having run nothing is the failure it exists to prevent.')
  process.exit(2)
}

const lib = await import(join(jsDir, 'dist/index.js'))
const tmp = mkdtempSync(join(tmpdir(), 'carve-claims-'))
const normalize = (html) => html.replace(/\s+/g, ' ').trim()

function render(engine, source) {
  if (engine.kind === 'js') return normalize(lib.carveToHtml(source))
  const file = join(tmp, 'case.crv')
  writeFileSync(file, source)
  return normalize(execFileSync(engine.bin, ['--html', file], { encoding: 'utf8', maxBuffer: 1 << 26 }))
}

let failures = 0
try {
  for (const claim of CLAIMS) {
    const outputs = engines.map((e) => [e.name, render(e, claim.source)])
    const distinct = new Map()
    for (const [name, out] of outputs) {
      if (!distinct.has(out)) distinct.set(out, [])
      distinct.get(out).push(name)
    }

    let ok
    if (claim.expect === 'agree') {
      ok = distinct.size === 1
    } else {
      // Exactly two groups, and the odd one out is the named set.
      const groups = [...distinct.values()].map((names) => names.slice().sort().join(','))
      ok = distinct.size === 2 && groups.includes(claim.expect.slice().sort().join(','))
    }

    if (ok) {
      console.log(`ok  ${claim.section}: ${claim.quote}`)
      continue
    }
    failures++
    console.log(`FAIL ${claim.section}: ${claim.quote}`)
    console.log(`     source: ${JSON.stringify(claim.source)}`)
    for (const [out, names] of distinct) console.log(`     ${names.join(', ')}: ${out}`)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(`\n${CLAIMS.length - failures}/${CLAIMS.length} grammar claims hold.`)
if (failures > 0) {
  console.error(
    `${failures} claim(s) in resources/grammar.ebnf no longer describe the engines. Correct the sentence, or the engine.`,
  )
  process.exit(1)
}
