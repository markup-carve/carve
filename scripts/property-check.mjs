#!/usr/bin/env node
/*
 * Property check for the canonical writer (PART 11).
 *
 * The corpus pins documents somebody wrote. This generates documents nobody
 * wrote, from an alphabet of construct fragments, and asserts the two PART 11
 * invariants over them:
 *
 *   to_html(fmt(x)) == to_html(x)     meaning is preserved
 *   fmt(fmt(x))     == fmt(x)         the writer is idempotent
 *
 * plus, when sibling engine checkouts are present, that the three canonical
 * writers agree byte-for-byte.
 *
 * It exists because the corpus structurally cannot reach some shapes. Generated
 * documents combine constructs at indentations a human would not type, and that
 * is exactly where the writer's normalization changes meaning. The first run of
 * this script found 48 invariant failures and 41 cross-engine divergences that
 * a year of corpus testing had not.
 *
 * Deterministic: the seed is fixed, so a failure is reproducible and a run is
 * comparable against another build. Pass --seed=N to explore elsewhere.
 *
 *   node scripts/property-check.mjs [--count=800] [--seed=12345] [--engines]
 *
 * THIS IS A GATE. It exits non-zero on a violation.
 *
 * It was not, for its whole life, and no job ran it either - so the one check in
 * the repository that reaches the shapes carve#994 is about was both unexecuted
 * and, had it been executed, unable to fail. The header comment it used to carry
 * said "reporting only ... these invariants do not hold across the board today
 * (carve#359)". carve#359 is closed. What remains failing is one shape, named in
 * DECLARED below, and naming it is what lets everything else gate.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { rustBinary, rustBinaryCandidates } from './lib/engine-locations.mjs'
import { shortfall } from './spec/participants.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

// Construct fragments, deliberately including the escape forms and the
// block openers, since the interesting failures come from their combinations
// at unusual indentation rather than from any one of them alone.
export const ATOMS = [
  'word', 'a', '  ', '\n', '\n\n', '"q"', "'s", '...', '--', '---', '->', '<-', '=>',
  '(c)', '+-', '\\-\\-', '\\.', '\\"', '\\^', '\\#', '\\@', '[t](u)', '[t][r]', '`c`',
  '*b*', '/i/', '_u_', '~s~', '=h=', '{.cls}', '^[fn]', '@user', '#tag', ':name:',
  '- item', '# head', '> quote', '| a | b |', '::: note', ':::', '%% c', ':: term',
  '1. x', 'a) y', '$m$', '!img', '![a](/u)', '^ cap', '\\ ', '10\\ kg', '{^x^}', '{,y,}',
  // Added when the sweep was gated. The six shapes carve#994 opened with were
  // found by a different generator, and this alphabet reached NONE of them: it
  // has no thematic-break spelling other than `---`, no definition line, no
  // empty footnote body, no `+` attachment and no header cell. A gate whose
  // alphabet cannot reach the shape class it is gating is decorative, and the
  // way to find that out is to reintroduce a fixed defect and watch it stay
  // green, which is what happened here before these six lines existed.
  '***', '[a]: /u', '[^f]:', '| ~x~ |', '|= ~x~ |', '+ x',
]

/**
 * The generator, as a function of its seed, so a caller can reproduce a run.
 *
 * @param {{count: number, seed: number}} spec
 * @returns {string[]}
 */
export function generateDocuments({ count, seed }) {
  let state = seed
  const rnd = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  const pick = (a) => a[Math.floor(rnd() * a.length)]
  const one = () => {
    const len = 1 + Math.floor(rnd() * 8)
    return Array.from({ length: len }, () => pick(ATOMS)).join(rnd() < 0.4 ? ' ' : '\n') + '\n'
  }

  return Array.from({ length: count }, one)
}

/**
 * Apply a rewrite until it stops changing the document.
 *
 * A single pass is not enough and the difference is not cosmetic: removing the
 * last `\ ` on a line exposes the one before it, so `x \  \ ` reduced once still
 * carries the shape, still fails, and would be reported as an UNDECLARED
 * violation of a cause that is in fact declared. Seed 7 produces exactly that
 * document, which is why the sweep is run over several seeds before a count is
 * chosen: a minimizer that under-reaches turns the gate into a false alarm, and
 * a false alarm is disabled as quickly as a check that cannot fail.
 *
 * @param {(s: string) => string} rewrite
 * @param {string} src
 * @returns {string}
 */
export function untilStable(rewrite, src) {
  let current = src
  for (let i = 0; i < 1000; i++) {
    const next = rewrite(current)
    if (next === current) return current
    current = next
  }

  return current
}

/*
 * SHAPES THE WRITER IS KNOWN TO BREAK TODAY.
 *
 * The point of a declaration rather than a lowered bar: a generated sweep that
 * simply reported "38 failures" tells a reader nothing about whether the number
 * grew for a new reason, and a sweep whose alphabet was trimmed until it came
 * back clean would report nothing at all. So each known cause is named once,
 * with the ticket that owns it and a mechanical way to remove it from a
 * document, and EVERYTHING ELSE FAILS THE JOB.
 *
 * `without` must delete the shape and nothing else. A failing document is
 * attributed to an entry only when removing that entry's shape makes the
 * document satisfy both invariants - so a document that fails for a second
 * reason as well is never absorbed by the first, it is reported.
 *
 * Each entry is held to three assertions of its own, in `auditDeclarations`:
 *
 *   - its `witness` must STILL FAIL. When the engine fixes the shape, the
 *     declaration goes red and has to be deleted. A waiver that outlives its
 *     defect is how an allowlist becomes the thing being tested.
 *   - its `without` must actually remove its own witness, or it explains
 *     nothing and forgives nothing while looking like it does.
 *   - its `without` must leave `control` untouched, so an over-broad rewrite
 *     that quietly repairs unrelated documents cannot pass for an explanation.
 */
export const DECLARED = [
]

/**
 * Both PART 11 invariants over one document.
 *
 * @param {{carveToCarve: Function, carveToHtml: Function}} lib
 * @param {string} src
 * @returns {{kind: string, detail?: string} | null} a violation, or null
 */
export function violation(lib, src) {
  let once
  let twice
  try {
    once = lib.carveToCarve(src)
    twice = lib.carveToCarve(once)
  } catch (error) {
    return { kind: 'threw', detail: error.message }
  }
  if (once !== twice) return { kind: 'idempotence' }
  try {
    if (lib.carveToHtml(once) !== lib.carveToHtml(src)) return { kind: 'meaning' }
  } catch (error) {
    return { kind: 'threw', detail: error.message }
  }

  return null
}

/**
 * Which declared shape, if any, fully accounts for a failing document.
 *
 * @param {{carveToCarve: Function, carveToHtml: Function}} lib
 * @param {string} src
 * @param {typeof DECLARED} declared
 * @returns {string | null} the entry id, or null when nothing explains it
 */
export function attribute(lib, src, declared = DECLARED) {
  for (const entry of declared) {
    const reduced = entry.without(src)
    if (reduced === src) continue
    if (violation(lib, reduced) === null) return entry.id
  }

  return null
}

/**
 * The declarations' own two directions. Findings here fail the run just as a
 * new violation does: a stale entry and an over-broad one both turn the gate
 * back into the report it used to be.
 *
 * @param {{carveToCarve: Function, carveToHtml: Function}} lib
 * @param {typeof DECLARED} declared
 * @returns {string[]}
 */
export function auditDeclarations(lib, declared = DECLARED) {
  const findings = []
  for (const entry of declared) {
    if (violation(lib, entry.witness) === null) {
      findings.push(
        `DECLARATION ${entry.id} is stale: its witness ${JSON.stringify(entry.witness)} now ` +
          `satisfies both invariants. The engine fixed it (${entry.ticket}); delete the entry ` +
          `so the shape is gated like every other.`,
      )
    }
    if (entry.without(entry.witness) === entry.witness) {
      findings.push(
        `DECLARATION ${entry.id} does not remove its own witness, so it can explain nothing.`,
      )
    }
    if (entry.without(entry.control) !== entry.control) {
      findings.push(
        `DECLARATION ${entry.id} rewrites its control document ${JSON.stringify(entry.control)}, ` +
          `which does not carry the shape. An over-broad rewrite explains failures it did not cause.`,
      )
    }
  }

  return findings
}

/**
 * The three engines' `--carve` output for one document, when their checkouts
 * are present.
 *
 * Resolution goes through the environment FIRST. It did not, and in the only
 * job that sets those variables the built binaries live inside the workspace,
 * not beside it - so every spawn threw, every engine was recorded as `ERROR`,
 * the three ERRORs compared equal, and the run printed `0 divergences`. A zero
 * that means "nothing ran" (carve#755).
 *
 * @returns {Array<{name: string, dir: string, run: (file: string) => string}>}
 */
export function engineRunners(base = root) {
  const at = (variable, fallback) => process.env[variable] ?? resolve(base, fallback)
  const rs = at('CARVE_RS_DIR', '../carve-rs')
  const js = at('CARVE_JS_DIR', '../carve-js')
  const php = at('CARVE_PHP_DIR', '../carve-php')

  return [
    {
      name: 'rust',
      dir: rs,
      // The path is RESOLVED rather than spelled: CARGO_TARGET_DIR moves the
      // binary out of the checkout, and a spelled path would then spawn
      // something that does not exist and record ERROR for an engine that is
      // built and fresh (carve#1287).
      run: (f) => {
        const bin = rustBinary(rs)
        if (!bin) throw new Error(`carve-rs is not built; looked in ${rustBinaryCandidates(rs).join(', ')}`)

        return execFileSync(bin, ['--carve', f], { encoding: 'utf8' })
      },
    },
    { name: 'js', dir: js, run: (f) => execFileSync('node', [resolve(js, 'dist/cli.js'), '--carve', f], { encoding: 'utf8' }) },
    { name: 'php', dir: php, run: (f) => execFileSync('php', [resolve(php, 'bin/carve'), '--carve', f], { encoding: 'utf8' }) },
  ]
}

const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')
if (isMain) process.exit(await main())

async function main() {
  const arg = (name, fallback) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : fallback
  }
  const count = Number(arg('count', 800))
  const seed = Number(arg('seed', 12345))
  const compareEngines = process.argv.includes('--engines')

  const lib = await import('@markup-carve/carve')
  const docs = generateDocuments({ count, seed })

  /*
   * HOW MANY DOCUMENTS THIS RUN GENERATED (carve#755, variant 2).
   *
   * Measured before this guard existed: `--count=0` printed `generated 0
   * documents / idempotence failures: 0 / meaning changed: 0 / threw: 0` and
   * exited 0. Now that the run gates, zero failures over zero documents would
   * be a GREEN JOB rather than a misleading report, which makes the guard
   * load-bearing rather than merely tidy.
   */
  const population = shortfall({
    label: 'GENERATED',
    actual: docs.length,
    atLeast: 1,
    of: 'document(s)',
    hint: 'Raise --count.',
  })
  if (population !== null) {
    console.error(population)

    return 2
  }

  const undeclared = []
  const explained = new Map(DECLARED.map((entry) => [entry.id, 0]))
  const counts = { idempotence: 0, meaning: 0, threw: 0 }

  for (const src of docs) {
    const found = violation(lib, src)
    if (found === null) continue
    counts[found.kind]++
    const cause = attribute(lib, src, DECLARED)
    if (cause === null) undeclared.push([found, src])
    else explained.set(cause, explained.get(cause) + 1)
  }

  console.log(`generated ${docs.length} documents (seed ${seed})`)
  console.log(`  idempotence failures : ${counts.idempotence}`)
  console.log(`  meaning changed      : ${counts.meaning}`)
  console.log(`  threw                : ${counts.threw}`)
  for (const entry of DECLARED) {
    console.log(`  declared ${entry.id} (${entry.ticket}): ${explained.get(entry.id)}`)
  }

  const findings = auditDeclarations(lib, DECLARED)
  for (const finding of findings) console.error(finding)

  for (const [found, src] of undeclared.slice(0, 10)) {
    console.error(
      `UNDECLARED ${found.kind.toUpperCase()} ${JSON.stringify(src)}` +
        (found.detail ? ` (${found.detail})` : ''),
    )
  }
  if (undeclared.length > 10) {
    console.error(`... and ${undeclared.length - 10} more`)
  }

  let diffs = 0
  if (compareEngines) diffs = compareWriters(docs)

  const bad = undeclared.length + findings.length + diffs
  if (bad === 0) {
    const declaredHits = [...explained.values()].reduce((a, b) => a + b, 0)
    console.log(
      declaredHits === 0
        ? 'PART 11 section 1 holds over every generated document.'
        : `PART 11 section 1 holds over every generated document except the ${declaredHits} ` +
          `carrying a declared shape above.`,
    )

    return 0
  }
  console.error(
    `PART 11 section 1: ${undeclared.length} undeclared violation(s), ` +
      `${findings.length} declaration finding(s), ${diffs} cross-engine divergence(s). ` +
      `The invariant outranks the per-construct rules (PART 11 section 1a).`,
  )

  return 1
}

/**
 * The third invariant, when the sibling checkouts are there: the three
 * canonical writers must agree byte for byte on the same document.
 *
 * @param {string[]} docs
 * @returns {number} divergences, counting a missing engine as one
 */
function compareWriters(docs) {
  const engines = engineRunners()
  const dir = resolve(tmpdir(), 'carve-property-check')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  let diffs = 0
  const shown = new Set()
  docs.forEach((src, i) => {
    const file = resolve(dir, `g${String(i).padStart(4, '0')}.crv`)
    writeFileSync(file, src)
    const outputs = engines.map(({ name, run }) => {
      try {
        return [name, run(file)]
      } catch (error) {
        return [name, `ERROR ${error.message}`]
      }
    })
    if (new Set(outputs.map(([, out]) => out)).size === 1) return
    diffs++
    // The FIRST few in full, because a count alone cannot be acted on and the
    // documents are regenerated from the seed rather than stored.
    if (shown.size < 5) {
      shown.add(src)
      console.error(`DIVERGENT ${JSON.stringify(src)}`)
      for (const [name, out] of outputs) console.error(`    ${name}: ${JSON.stringify(out)}`)
    }
  })
  console.log(`  cross-engine --carve divergences: ${diffs}`)
  rmSync(dir, { recursive: true, force: true })

  return diffs
}
