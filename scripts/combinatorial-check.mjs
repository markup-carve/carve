#!/usr/bin/env node
/*
 * Differential check over COMBINATIONS of constructs.
 *
 * The corpus pins constructs. It does not pin what happens when two of them
 * meet, and that is where every cross-engine divergence in carve#427 lived:
 *
 *   - attribute order on an unwrapped heading: nested headings were covered,
 *     attributes were covered, no case gave a nested heading attributes. Four
 *     implementations held four different answers and every suite was green.
 *   - `data-source-line` vs. the generated id: both covered, never together.
 *   - `[Heading][]` resolution into containers: both covered, never together.
 *
 * A pair space is bigger than a hand-written case list, so it has to be
 * generated. This walks a CURATED product of axes - constructs known to share
 * a code path, an attribute slot, or a resolution pass - renders each document
 * through every available implementation, and reports where they disagree.
 *
 * There are no expected-output files. The oracle is agreement, which is
 * precisely the property that was missing. A second oracle catches the case
 * agreement cannot: structural invariants that must hold whatever the agreed
 * answer turns out to be (all engines agreeing on a wrong answer is a failure
 * mode this project has hit before - see the blockquote/fence lazy bug).
 *
 * This does NOT replace the corpus. A divergence found here is a question, not
 * a verdict: decide the canonical answer, then promote it to a corpus case in
 * docs/examples/edge-cases.md so it is pinned forever after.
 *
 * Usage:
 *   node scripts/combinatorial-check.mjs
 *   node scripts/combinatorial-check.mjs --verbose   # print every document
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { carveToHtml } from '@markup-carve/carve'
import { parse as specParse, Refuse } from './spec/layout.mjs'
import { renderDoc as specRender } from './spec/html.mjs'
import { phpDir, rustDir } from './lib/engine-locations.mjs'

const verbose = process.argv.includes('--verbose')

/*
 * ============================================================================
 * AXES
 * ============================================================================
 *
 * The real artifact of this script. Each entry is a construct that INTERACTS
 * with the others - it lands in the same attribute slot, takes the same
 * rendering branch, or is resolved by the same pass. Adding an axis is cheaper
 * than hand-writing the cases it stands for, and it records the interaction.
 *
 * Deliberately NOT a cross product of the whole language: that is millions of
 * documents, almost all of them noise. Grow this when a new construct shares a
 * path with one already here.
 */

// Heading level matters because the section-wrapping stack closes on it.
const HEADINGS = ['# H', '## H']

// Attribute PROVENANCE is the axis that exposed PART 10 §1: the author's own
// attributes keep their source order and a generated id joins at the end, so
// an authored id and a slugged one take different paths through the same code.
const ATTRS = [
  { name: 'none', line: null },
  { name: 'authored-only', line: '{a=b .c}' },
  { name: 'authored-id-first', line: '{#x a=b}' },
  { name: 'authored-id-only', line: '{#x}' },
]

// Container nesting is what made the other axes reachable at all: an unwrapped
// heading was only obtainable inside a container until the `sections` option
// existed.
const CONTAINERS = [
  { name: 'top-level', wrap: (s) => s },
  { name: 'blockquote', wrap: (s) => prefixLines(s, '> ') },
  { name: 'div', wrap: (s) => `:::\n${s}\n:::` },
  { name: 'list-item', wrap: (s) => `- ${indentContinuation(s, '  ')}` },
  { name: 'quoted-div', wrap: (s) => prefixLines(`:::\n${s}\n:::`, '> ') },
]

// A trailing body exercises the "content up to the next same-or-shallower
// heading" half of the wrapping rule, and gives crossrefs something to sit
// after.
const BODIES = [
  { name: 'bare', text: null },
  { name: 'paragraph', text: 'Body.' },
  { name: 'crossref', text: 'See </#x> and [H][].' },
]

const prefixLines = (s, prefix) =>
  s
    .split('\n')
    .map((l) => (l === '' ? prefix.trimEnd() : prefix + l))
    .join('\n')

const indentContinuation = (s, indent) => s.split('\n').join(`\n${indent}`)

function* documents() {
  for (const heading of HEADINGS) {
    for (const attrs of ATTRS) {
      for (const container of CONTAINERS) {
        for (const body of BODIES) {
          const head = attrs.line ? `${attrs.line}\n${heading}` : heading
          const inner = body.text ? `${head}\n\n${body.text}` : head
          yield {
            id: `${heading.length}h/${attrs.name}/${container.name}/${body.name}`,
            source: `${container.wrap(inner)}\n`,
          }
        }
      }
    }
  }
}

/*
 * ============================================================================
 * ENGINES
 * ============================================================================
 *
 * Every implementation that claims to render Carve, INCLUDING the executable
 * spec in scripts/spec. That one was the fourth wrong answer on attribute
 * order - it dropped the attributes entirely - so leaving it out would have
 * meant the check could not see the bug it was written for.
 */
const engines = [
  {
    name: 'carve-js',
    // In-process: this is the pinned reference build the corpus already runs
    // against, and it is two orders of magnitude faster than a spawn per case.
    render: (source) => carveToHtml(source),
  },
  {
    name: 'exec-spec',
    render: (source) => {
      // A refusal is THROWN, not returned - `scripts/formal-core-check.mjs`
      // catches it the same way. Getting this wrong would file every
      // out-of-subset document as an engine error, so a future axis that
      // reaches the subset boundary would read as breakage rather than as a
      // construct the oracle deliberately does not model.
      try {
        return specRender(specParse(source))
      } catch (e) {
        if (e instanceof Refuse || e.refuse) return { refused: e.message ?? 'out of subset' }
        throw e
      }
    },
  },
  {
    name: 'carve-rs',
    cli: { cwd: rustDir(), cmd: ['cargo', 'run', '--quiet', '--'] },
  },
  {
    name: 'carve-php',
    cli: { cwd: phpDir(), cmd: ['php', 'bin/carve'] },
  },
]

function runCli(engine, file) {
  const [bin, ...args] = engine.cli.cmd
  const r = spawnSync(bin, [...args, file], {
    cwd: engine.cli.cwd,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 20 * 1024 * 1024,
  })
  if (r.status !== 0) return { error: (r.stderr || r.error?.message || `exit ${r.status}`).trim() }
  return (r.stdout ?? '').trim()
}

/*
 * What revision an engine actually is.
 *
 * A CLI engine is whatever its checkout happens to be sitting on - a feature
 * branch, a dirty tree, twenty commits behind main - and a stale checkout
 * produces divergences that look exactly like real ones. The first run of this
 * script reported two classes that were nothing but an out-of-date working
 * copy. Printing the revision makes that visible in the output instead of
 * costing an investigation.
 */
function provenance(engine) {
  if (!engine.cli) return 'in-process (this repo\'s pinned dependency)'
  const git = (args) =>
    (spawnSync('git', args, { cwd: engine.cli.cwd, encoding: 'utf8' }).stdout ?? '').trim()
  const head = git(['rev-parse', '--short', 'HEAD'])
  if (!head) return 'not a git checkout'
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const dirty = git(['status', '--porcelain']) ? ', DIRTY' : ''
  const behind = git(['rev-list', '--count', 'HEAD..origin/main'])
  const drift = behind && behind !== '0' ? `, ${behind} behind origin/main` : ''
  return `${branch} @ ${head}${dirty}${drift}`
}

function probe(engine, tmpDir) {
  try {
    const file = join(tmpDir, 'probe.crv')
    writeFileSync(file, '# Hi\n')
    const out = engine.cli ? runCli(engine, file) : engine.render('# Hi\n')
    if (typeof out !== 'string') return { ok: false, reason: out.error ?? 'no output' }
    return out.includes('<h1') ? { ok: true } : { ok: false, reason: `unexpected probe output: ${out}` }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

/*
 * ============================================================================
 * INVARIANTS
 * ============================================================================
 *
 * The oracle agreement cannot provide. These hold no matter which spelling the
 * engines settle on, so they fire even when every implementation agrees and
 * every one of them is wrong.
 */
const INVARIANTS = [
  {
    name: 'no dangling fragment link',
    // Worth more than the rest combined: this one catches both the
    // headingPermalinks bug in carve-js (anchor emitted, id stripped) and the
    // data-source-line ordering bug in carve-rs, neither of which anyone knew
    // to look for in advance.
    check(html) {
      const ids = new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]))
      const dangling = [...html.matchAll(/href="#([^"]+)"/g)]
        .map((m) => m[1])
        .filter((frag) => !ids.has(frag))
      return dangling.length ? `href="#${dangling[0]}" has no matching id` : null
    },
  },
  {
    name: 'no duplicate DOM id',
    check(html) {
      const seen = new Map()
      for (const m of html.matchAll(/\sid="([^"]*)"/g)) {
        seen.set(m[1], (seen.get(m[1]) ?? 0) + 1)
      }
      const dup = [...seen].find(([, n]) => n > 1)
      return dup ? `id="${dup[0]}" appears ${dup[1]} times` : null
    },
  },
  {
    name: 'every heading carries an id somewhere',
    // Either on the <h*> or on the <section> wrapping it - a heading a
    // fragment URL cannot reach is a heading with no anchor.
    check(html) {
      const headings = (html.match(/<h[1-6][\s>]/g) ?? []).length
      if (headings === 0) return null
      const anchors = (html.match(/<(?:section|h[1-6])[^>]*\sid="/g) ?? []).length
      return anchors >= headings ? null : `${headings} heading(s), ${anchors} id-bearing element(s)`
    },
  },
]

/*
 * ============================================================================
 * RUN
 * ============================================================================
 */
const tmpDir = mkdtempSync(join(tmpdir(), 'carve-comb-'))
let exitCode = 0

try {
  const available = []
  for (const engine of engines) {
    const p = probe(engine, tmpDir)
    if (p.ok) available.push(engine)
    // Loud, not silent: a checker that quietly drops half its engines reports
    // "no divergences" for the wrong reason.
    else console.log(`skip ${engine.name}: ${p.reason}`)
  }

  if (available.length < 2) {
    console.error(
      `\nNeed at least two engines to compare; ${available.length} available. ` +
        'Set CARVE_RS_DIR / CARVE_PHP_DIR, or build the sibling checkouts.',
    )
    process.exit(2)
  }

  console.log('engines:')
  for (const engine of available) console.log(`  ${engine.name.padEnd(10)} ${provenance(engine)}`)
  console.log()

  const divergences = []
  const violations = []
  const refusals = []
  let count = 0

  for (const doc of documents()) {
    count++
    const file = join(tmpDir, 'case.crv')
    writeFileSync(file, doc.source)

    const rendered = new Map()
    for (const engine of available) {
      let out
      try {
        out = engine.cli ? runCli(engine, file) : engine.render(doc.source)
      } catch (e) {
        out = { error: e.message }
      }
      rendered.set(engine.name, out)
    }

    // A refusal is a legitimate answer from the executable spec (its subset is
    // narrower than the language) and is not a divergence; an ERROR is.
    const comparable = [...rendered].filter(([, v]) => typeof v === 'string')
    const errored = [...rendered].filter(([, v]) => v && typeof v === 'object' && v.error)
    for (const [name, v] of rendered) {
      if (v && typeof v === 'object' && v.refused) refusals.push({ doc, engine: name, reason: v.refused })
    }
    for (const [name, v] of errored) {
      violations.push({ doc, engine: name, invariant: 'engine error', detail: v.error })
    }

    const distinct = new Set(comparable.map(([, html]) => html))
    if (comparable.length >= 2 && distinct.size > 1) divergences.push({ doc, rendered: comparable })

    for (const [name, html] of comparable) {
      for (const inv of INVARIANTS) {
        const detail = inv.check(html)
        if (detail) violations.push({ doc, engine: name, invariant: inv.name, detail })
      }
    }

    if (verbose) console.log(`  ${doc.id}`)
  }

  const report = (title, rows, format) => {
    if (!rows.length) return
    console.log(`\n${title} (${rows.length})\n${'='.repeat(60)}`)
    for (const row of rows) console.log(format(row))
    exitCode = 1
  }

  report('DIVERGENCES', divergences, ({ doc, rendered }) => {
    const counts = new Map()
    for (const [, html] of rendered) counts.set(html, (counts.get(html) ?? 0) + 1)
    const majority = Math.max(...counts.values())
    const lines = rendered.map(([name, html]) => {
      const flag = counts.get(html) < majority ? '  <-- differs' : ''
      return `    ${name.padEnd(10)} ${JSON.stringify(html)}${flag}`
    })
    return `\n  ${doc.id}\n  ${JSON.stringify(doc.source)}\n${lines.join('\n')}`
  })

  report(
    'INVARIANT VIOLATIONS',
    violations,
    ({ doc, engine, invariant, detail }) =>
      `\n  ${doc.id}\n  ${JSON.stringify(doc.source)}\n    ${engine}: ${invariant} - ${detail}`,
  )

  console.log(
    `\n${count} documents x ${available.length} engines` +
      `\ndivergences: ${divergences.length}` +
      `\ninvariant violations: ${violations.length}` +
      // Not a failure: the executable spec models a narrower subset than the
      // language. Counted anyway, because a refusal silently dropped is a
      // document nobody compared.
      `\nrefused (not compared): ${refusals.length}`,
  )

  // Render OPTIONS are a axis this cannot walk yet, and saying so beats a
  // silently narrower run: neither the carve-rs nor the carve-php CLI exposes
  // `sections` or source-line stamping, and the executable spec implements
  // neither. Wiring those flags promotes the option axis from "carve-js only,
  // invariants only" to a real differential.
  console.log(
    '\nnot covered: render options (sections, sourceLine) - no CLI flag in ' +
      'carve-rs / carve-php, unimplemented in the executable spec',
  )

  if (exitCode === 0) console.log('\nno divergences')
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}

process.exit(exitCode)
