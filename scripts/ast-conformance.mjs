#!/usr/bin/env node
/*
 * PART 12 conformance check for serialized ASTs.
 *
 * PART 12 says a parsed document is exchangeable: field names are spec surface,
 * every node carries `pos`, and a serialize/deserialize round trip must equal
 * the parse. Nothing verified any of that, which is how the engines' field
 * names diverged in the first place - carve-js calls a link's destination
 * `href`, carve-php calls it `destination` - and how a serializer can ship
 * without positions while the spec requires them.
 *
 * Every engine is checked against resources/ast-schema.json, the published
 * encoding of that contract, plus the two things a schema cannot express:
 * whether a node carries a POSITION at all, and whether the span it reports
 * actually covers the text the node came from.
 *
 * carve-js is still the reference in the sense PART 12 §1 means - the schema
 * describes its shape - but it is no longer the yardstick this script measures
 * with. Comparing engines against whatever the reference happened to emit meant
 * the reference could not itself be wrong, and a type it never emits was not
 * checked at all.
 *
 *   node scripts/ast-conformance.mjs [--limit=N]
 *
 * The reference engine is checked against the WHOLE corpus by default. A limit
 * only samples, and a sample is how three classes of wrong span went unreported
 * while this script said the reference was conformant: definition lists that
 * re-indent their body, and an escaped space extending a text node past its
 * value, both sit outside the first 200 documents. Use --limit only to iterate
 * quickly; CI should not pass one.
 *
 * Sibling checkouts, same convention as compare-impls.mjs:
 *   ../carve-js    (reference, required)
 *   ../carve-rs    (serializes through its own `carve --json`)
 *   ../carve-rb    (serializes carve-rs's tree through the Ruby binding)
 *   ../carve-php   (serializes through `bin/carve --json`)
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { shapeOf, shapePaths } from './spec/ast-shape.mjs'
import { checkPositions } from './spec/ast-positions.mjs'
import { checkReferenceFields } from './spec/ast-references.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

/*
 * The published contract, as data: resources/ast-schema.json.
 *
 * This used to be a hand-rolled comparison against whatever the reference
 * happened to emit over the corpus - so a field the reference never produced in
 * 504 documents was unchecked, and a node type the reference does not emit at
 * all was skipped in silence (`if (!reference) continue`). An engine could
 * publish `definition_term` nodes, or a `mention` carrying four extra internal
 * fields, and this script had nothing to say.
 *
 * The schema is checked against the reference in tests/ast-schema.test.mjs, so
 * "the schema says X" and "the reference does X" cannot drift apart quietly.
 */
const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema)

const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity

/*
 * The satellite engines serialize through a SUBPROCESS PER DOCUMENT, so they
 * cost about a tenth of a second each where the reference costs nothing.
 *
 * That is why they used to run over only the first twelve samples - and why
 * this script reported "carve-php: conformant" while carve-php had eight nodes
 * with no position. All eight sit in documents 41, 56, 63, 96 and 104; the
 * first twelve documents alphabetically contain none of them. The cap was not
 * a sampling decision, it was a check that could not fail, and it printed a
 * clean bill of health for an engine the full corpus finds non-conformant.
 *
 * They now run over everything by default (about 45 seconds each). A smaller
 * cap stays available for a quick local pass, and the report NAMES the count it
 * ran over, so a partial run can never again read as a complete one.
 */
const satelliteLimitArg = process.argv.find((a) => a.startsWith('--satellite-limit='))
const satelliteLimit = satelliteLimitArg
  ? Number(satelliteLimitArg.slice('--satellite-limit='.length))
  : Infinity

const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')
const rbDir = process.env.CARVE_RB_DIR ?? resolve(root, '../carve-rb')
const rsDir = process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs')
const phpDir = process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php')

/*
 * How many distinct findings to PRINT. This bounds output only - every document
 * is still checked and every finding still counted.
 *
 * It did not used to work that way. Each engine stopped collecting once it had
 * accumulated a fixed number of findings (40 for the reference, 20 for the
 * others), by passing a throwaway array to the checker for every later
 * document. Those documents were parsed, walked, and their findings dropped on
 * the floor - and since the summary line printed the capped total, a run that
 * had stopped looking was indistinguishable from a clean one.
 *
 * That hid a real defect. carve-js emitted the node type `critic-comment`,
 * hyphenated, which this file's own vocabulary gate is meant to reject - and it
 * never fired, because the one corpus document exercising it sorts past where
 * the reference hit its cap. The gate only started reporting once unrelated
 * position fixes dropped the finding count below 40 and the document came back
 * into view.
 */
const DISPLAY_LIMIT = Number(process.env.CARVE_DISPLAY_LIMIT ?? 8)

/**
 * Describe a built artifact, and say plainly when it is OLDER THAN ITS SOURCE.
 *
 * This is the failure that made carve#475's own table wrong. The checker reads
 * whatever build is on disk and reports it as the engine's conformance, with
 * nothing in the output to say how old it is. An Aug 1 build of carve-rs
 * reported 144 schema violations - the pre-node definition-list shape the engine
 * had already stopped emitting - while the same checkout, rebuilt, reported 4
 * findings. Both runs looked identical.
 *
 * A stale build reading as a current one is strictly worse than the skip this
 * script already reports, because it produces a NUMBER, and a number gets
 * believed and filed.
 */
function buildStatus(artifact, sourceDir, extensions) {
  let built
  try {
    built = statSync(artifact).mtimeMs
  } catch {
    return { text: 'build date unknown', stale: false }
  }
  const stamp = new Date(built).toISOString().slice(0, 16).replace('T', ' ')

  let newestSource = 0
  const walk = (dir, depth) => {
    if (depth > 6) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'target' || entry.name[0] === '.') continue
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(full, depth + 1)
      else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        try {
          newestSource = Math.max(newestSource, statSync(full).mtimeMs)
        } catch {
          /* unreadable file tells us nothing */
        }
      }
    }
  }
  walk(sourceDir, 0)

  const stale = newestSource > built
  return {
    text: stale ? `built ${stamp}, STALE - source is newer, rebuild before believing this` : `built ${stamp}`,
    stale,
  }
}

const staleBuilds = []


/**
 * Engines that were not measured at all.
 *
 * A skip used to read as one line of prose in the middle of the output, so a
 * run with no satellites present looked almost exactly like a run where every
 * satellite passed - and since this script does not run in CI (carve#475),
 * that was the normal case. `test/corpus.test.ts` already carries the same
 * lesson in a comment: silently skipped "is exactly how 14 spec categories once
 * went unvalidated".
 */
const notMeasured = []

/**
 * Per-engine §1a counts, filled by `report` so the gate at the end sees every
 * engine without reaching into per-block locals.
 *
 * Declared HERE, next to the other accumulators, and not beside `report`:
 * `report` is called before that point in the file, and a `const` in module
 * scope is not hoisted. The first version threw
 * "Cannot access 'adjacentTextRunCounts' before initialization" and exited 1,
 * which looked exactly like the gate firing.
 */
const adjacentTextRunCounts = []

function skip(label, reason) {
  notMeasured.push(`${label} (${reason})`)
  console.log(`${label}: NOT MEASURED - ${reason}\n`)
}


/**
 * Shape, against the published schema.
 *
 * Covers the root (PART 12 §7: `type`, `children`, `srcByteLength`, nothing
 * else), every node's field set, and the type identifiers themselves. The root
 * needs a rule of its own precisely because it is the one node with no sibling
 * of its type to compare against, which is how the engines diverged there
 * unnoticed: carve-php dropped a document's frontmatter and footnote
 * definitions on the way out, and carve-rb spelled two root fields
 * `source_len` and `footnote_defs` (carve#411).
 */
function checkShape(doc, findings) {
  if (validateSchema(doc)) return
  for (const error of validateSchema.errors ?? []) {
    // `must match "then" schema` is ajv reporting the if/then dispatch failing
    // as a whole; the specific reason is already in the list beside it.
    if (error.keyword === 'if') continue
    const extra = error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : ''
    findings.push(`schema: ${error.instancePath || '/'} ${error.message}${extra}`)
  }
}

/**
 * Content the schema cannot see: a document whose SOURCE has frontmatter must
 * come back with a frontmatter node.
 *
 * A serializer that drops the block entirely produces a perfectly valid
 * document - which is the failure carve#411 found in carve-php, and one no
 * shape check can catch.
 */
function checkFrontmatterSurvives(doc, source, findings) {
  if (!/^---\r?\n/.test(source)) return
  const hasNode = Array.isArray(doc.children) && doc.children.some((n) => n?.type === 'frontmatter')
  // The pre-§7 root form still counts as carrying it, so an engine that has not
  // moved it into the tree is reported ONCE by the schema rather than twice.
  if (!hasNode && !('frontmatter' in doc)) {
    findings.push('source has frontmatter but the tree does not carry it (PART 12 section 7)')
  }
}


/**
 * Compare an engine's tree against the reference's and report the FIRST place
 * they diverge, which is the one worth reading.
 */
function checkShapeParity(name, doc, findings) {
  const reference = referenceShapes.get(name)
  if (!reference) return
  const mine = shapePaths(shapeOf(doc))
  const theirs = shapePaths(reference)
  if (mine.length === theirs.length && mine.every((p, i) => p === theirs[i])) return
  const at = mine.findIndex((p, i) => p !== theirs[i])
  const where = at === -1 ? Math.min(mine.length, theirs.length) : at
  findings.push(
    `${name}: tree differs from the reference at ${theirs[where] ?? '(end)'} ` +
      `- reference has ${theirs.length} nodes, this has ${mine.length} ` +
      `(got ${mine[where] ?? '(end)'})`,
  )
}

const referenceShapes = new Map()

/**
 * PART 12 §1a: a node's children hold no two adjacent `text` nodes.
 *
 * This is the one PART 12 rule the schema cannot express - JSON Schema has no
 * way to forbid two adjacent array entries of the same shape - so if it is not
 * checked here it is not checked anywhere. It went unmeasured long enough for
 * carve-php to publish 107 runs across 56 corpus documents and carve-rs 18
 * across 6, while both validated cleanly.
 *
 * Reported as a §1a finding rather than folded into shape parity, because
 * shape parity is currently blocked on carve#481 (engines serialize different
 * pipeline stages) and would drown this in noise it cannot fix.
 */
function checkAdjacentTextRuns(doc, findings) {
  const seen = new Set()
  const scan = (node, path) => {
    if (Array.isArray(node)) {
      for (let i = 1; i < node.length; i++) {
        const left = node[i - 1]
        const right = node[i]
        if (left?.type === 'text' && right?.type === 'text' && !seen.has(path)) {
          seen.add(path)
          findings.push(
            `§1a adjacent text runs at ${path}: ${JSON.stringify(left.value)} + ${JSON.stringify(right.value)}`,
          )
        }
      }
      node.forEach((child, i) => scan(child, `${path}[${i}]`))
      return
    }
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key === 'pos') continue
      scan(value, `${path}.${key}`)
    }
  }
  scan(doc.children ?? [], '$.children')
}

function checkDocument(name, doc, source, findings) {
  // Prefix every finding with the document, the way the parse/serialize
  // failures above already do. Without it the shape and position checks - the
  // large majority - reached the report anonymous, so the grouping had no
  // filename to keep and no finding could be opened (carve#534 lists clusters
  // nobody could reproduce for exactly this reason).
  const own = []
  checkShape(doc, own)
  checkAdjacentTextRuns(doc, own)
  checkFrontmatterSurvives(doc, source, own)
  checkPositions(doc, source, own)
  checkReferenceFields(doc, source, own)
  for (const f of own) findings.push(name.endsWith('.crv') ? name + ': ' + f : f)
}

/**
 * Provenance for the REFERENCE checkout, which had none.
 *
 * carve-rs and carve-rb are described by buildStatus above, so a stale binary
 * announces itself. carve-js was reported as a bare "carve-js (reference)" -
 * no commit, no dirty flag, no comparison against the build package.json pins.
 *
 * That is the worst place in this script to have no provenance. Every satellite
 * is diffed against the reference's tree (referenceShapes), so a reference that
 * is behind or locally modified does not just misreport ITSELF - it turns every
 * satellite's "tree differs from the reference" line into a statement about the
 * operator's working copy. Measured while working carve#534: this checkout
 * reported 70 reference findings, 35 distinct, most of them §1a adjacent text
 * runs, where the build package.json pins has ZERO §1a violations over the same
 * corpus. Numbers nobody can attribute are numbers nobody can act on, which is
 * what that issue is about.
 */
function referenceProvenance(dir) {
  const git = (args) => {
    try {
      return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }
  const head = git(['rev-parse', 'HEAD'])
  const dirty = git(['status', '--porcelain'])
  const pin = (() => {
    try {
      const spec = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
        .devDependencies['@markup-carve/carve']
      const at = spec.lastIndexOf('#')
      return at === -1 ? null : spec.slice(at + 1)
    } catch {
      return null
    }
  })()

  const notes = []
  if (head) notes.push(head.slice(0, 7))
  else notes.push('not a git checkout')
  if (dirty) notes.push(`${dirty.split('\n').length} file(s) MODIFIED`)
  const offPin = Boolean(pin && head && !head.startsWith(pin.slice(0, 7)))
  if (offPin) notes.push(`NOT the pinned build (package.json pins ${pin.slice(0, 7)})`)
  const build = buildStatus(resolve(dir, 'dist/index.js'), resolve(dir, 'src'), ['.ts', '.js'])
  notes.push(build.text)

  // DIRTY and STALE are operator error wherever they happen, so they join the
  // stale-build roll-up that CARVE_REQUIRE_ALL_ENGINES=1 fails on.
  //
  // OFF-PIN deliberately does not. The scheduled workflow checks carve-js out
  // at its DEFAULT BRANCH, which is ahead of the pin for as long as it takes a
  // spec rule to ship - the normal state, not a fault. Failing on it would put
  // a scheduled job permanently red, and this file's neighbours already say
  // what happens then: a permanently red scheduled job gets muted, which is
  // the failure the job exists to prevent. It is reported instead, once, at the
  // end, so a recorded number always names the reference that produced it.
  return { text: notes.join(', '), suspect: Boolean(dirty) || build.stale, offPin }
}

const corpusDir = resolve(root, 'tests/corpus')

/**
 * Synthetic samples carrying ASTRAL characters, because no corpus case does.
 *
 * Codepoints, UTF-16 code units and bytes agree on ASCII, and codepoints and
 * UTF-16 agree across the whole Basic Multilingual Plane - so a document needs a
 * SURROGATE PAIR before the position unit PART 12 §4 pins is observable at all.
 * Without these the unit check above would pass for an engine reporting UTF-16,
 * which is exactly the kind of check that cannot fail.
 */
const ASTRAL_SAMPLES = [
  { name: '<astral: emphasis after an emoji>', source: '\u{1F600} plain *bold* tail\n' },
  { name: '<astral: inside a blockquote>', source: '# H\n\n> \u{1F600} quoted *b*\n' },
  { name: '<astral: across two lines>', source: '\u{1F600} one\n\u{1F600}\u{1F600} two\n' },
]

const samples = [
  ...ASTRAL_SAMPLES,
  ...readdirSync(corpusDir)
    .filter((f) => f.endsWith('.crv'))
    .sort()
    .slice(0, limit)
    .map((f) => ({ name: f, source: readFileSync(resolve(corpusDir, f), 'utf8') })),
]

const satelliteSamples = samples.slice(0, satelliteLimit)

console.log(`PART 12 conformance over ${samples.length} corpus documents\n`)

// ---- reference: carve-js ---------------------------------------------------
if (!existsSync(resolve(jsDir, 'dist/index.js'))) {
  console.error(`carve-js build not found at ${jsDir}/dist - run npm run build there first.`)
  process.exit(2)
}
const lib = await import(resolve(jsDir, 'dist/index.js'))

if (typeof lib.toAstJson !== 'function') {
  console.error(`the build at ${jsDir} has no toAstJson - it predates PART 12 serialization.`)
  process.exit(2)
}

const jsFindings = []
for (const { name, source } of samples) {
  let doc
  try {
    // The SERIALIZED form, not the runtime tree. They differ: this engine keeps
    // frontmatter and footnote definitions on the root at runtime and maps them
    // into `children` on the way out, exactly as PART 12 §1 requires of an
    // implementation whose internals differ. Checking the runtime tree measured
    // a shape no consumer ever receives, and so could not see the wire form
    // every other engine here is measured against.
    // RESOLVED, not parse-only. `resolve()` is where a reference link becomes a
    // link or degrades to text, and every other engine here resolves inside its
    // own parse - so serializing carve-js's parse-only tree compared a stage no
    // other engine exposes and reported the difference as the satellite's.
    //
    // `ref` is the tell: the schema calls it "present only between parse and
    // resolve", so a reference surviving into the reference AST means the
    // reference AST was taken before resolve (carve#486).
    doc = lib.toAstJson(typeof lib.resolve === 'function' ? lib.resolve(lib.parse(source)) : lib.parse(source))
  } catch (error) {
    jsFindings.push(`${name}: parse threw - ${error.message}`)
    continue
  }
  checkDocument(name, doc, source, jsFindings)
  referenceShapes.set(name, shapeOf(doc))

  // PART 12 §6: serialize then deserialize must equal the parse.
  const round = JSON.parse(JSON.stringify(doc))
  if (JSON.stringify(round) !== JSON.stringify(doc)) {
    jsFindings.push(`${name}: JSON round trip is not identity`)
  }
}
const jsProv = referenceProvenance(jsDir)
if (jsProv.suspect) staleBuilds.push('carve-js (reference)')
report(`carve-js (reference) [${jsProv.text}]`, jsFindings)

// ---- carve-rs: serializes through its own `carve --json` --------------------
//
// Reached DIRECTLY now rather than only through carve-rb. The binding used to be
// the only route, which meant a finding could belong to either side and the
// report could not say which - and any engine over carve-rs that is not Ruby
// (carve-go, carve-py, carve-wasm) was measured by proxy or not at all.
//
// Uses an already-built binary rather than `cargo run`, so a checkout that has
// not been built says so instead of silently compiling for two minutes.
const rsBinary = ['target/release/carve', 'target/debug/carve']
  .map((p) => resolve(rsDir, p))
  .find((p) => existsSync(p))
if (rsBinary) {
  const rsFindings = []
  for (const { name, source } of satelliteSamples) {
    let doc
    try {
      doc = JSON.parse(
        execFileSync(rsBinary, ['--json'], {
          input: source,
          encoding: 'utf8',
          // Capture stderr rather than letting it through: an engine that
          // refuses every document would otherwise print 500 identical lines
          // over the report instead of one counted finding.
          stdio: ['pipe', 'pipe', 'pipe'],
        }),
      )
    } catch (error) {
      rsFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(name, doc, source, rsFindings)
    checkShapeParity(name, doc, rsFindings)
  }
  const rsBuild = buildStatus(rsBinary, resolve(rsDir, 'src'), ['.rs'])
  if (rsBuild.stale) staleBuilds.push('carve-rs')
  report(
    `carve-rs (over ${rsBinary.replace(rsDir + '/', '')} [${rsBuild.text}], ${satelliteSamples.length} documents)`,
    rsFindings,
  )
} else if (existsSync(rsDir)) {
  skip('carve-rs', 'checkout found but not built - run cargo build --release there')
} else {
  skip('carve-rs', 'checkout not found')
}

// ---- carve-rb: serializes carve-rs's tree ----------------------------------
if (existsSync(resolve(rbDir, 'lib/carve'))) {
  const rbFindings = []
  for (const { name, source } of satelliteSamples) {
    let doc
    try {
      const out = execFileSync(
        'ruby',
        ['-Ilib', '-e', 'require "carve"; require "json"; puts JSON.generate(Carve.parse(STDIN.read))'],
        {
          cwd: rbDir,
          input: source,
          encoding: 'utf8',
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      )
      doc = JSON.parse(out)
    } catch (error) {
      rbFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(name, doc, source, rbFindings)
    checkShapeParity(name, doc, rbFindings)
  }
  // The compiled extension, not the Ruby source: carve-rb wraps carve-rs
  // through a native build, so a stale `.so` reports the PARSER's old behavior
  // under the binding's name.
  const rbSo = ['lib/carve/carve.so', 'lib/carve/carve.bundle']
    .map((path) => resolve(rbDir, path))
    .find((path) => existsSync(path))
  const rbBuild = rbSo
    ? buildStatus(rbSo, resolve(rbDir, 'ext'), ['.rs', '.rb', '.toml'])
    : { text: 'no compiled extension found', stale: false }
  if (rbBuild.stale) staleBuilds.push('carve-rb')
  report(
    `carve-rb (over carve-rs [${rbBuild.text}], ${satelliteSamples.length} documents)`,
    rbFindings,
  )
} else {
  skip('carve-rb', 'checkout not found')
}

// ---- carve-php: serializes through bin/carve --json -------------------------
//
// This branch used to print "NO SERIALIZER - cannot be checked", which stopped
// being true when carve-php shipped AstCodec and `--json`. A checker that
// excuses an implementation it could actually check is worse than no checker:
// it reports conformance work as pending while a non-conformant serializer is
// already in use.
if (existsSync(resolve(phpDir, 'bin/carve'))) {
  const phpFindings = []
  for (const { name, source } of satelliteSamples) {
    let doc
    try {
      const out = execFileSync('php', ['bin/carve', '--json'], {
        cwd: phpDir,
        input: source,
        encoding: 'utf8',
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      doc = JSON.parse(out)
    } catch (error) {
      phpFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(name, doc, source, phpFindings)
    checkShapeParity(name, doc, phpFindings)
  }
  report(`carve-php (over bin/carve --json, ${satelliteSamples.length} documents)`, phpFindings)
} else if (existsSync(phpDir)) {
  skip('carve-php', 'checkout found but bin/carve is missing')
} else {
  skip('carve-php', 'checkout not found')
}

function report(label, findings) {
  const adjacent = findings.filter((f) => f.includes('§1a')).length
  if (adjacent > 0) adjacentTextRunCounts.push({ label, count: adjacent })
  if (findings.length === 0) {
    console.log(`${label}: conformant\n`)
    return
  }
  // Group, because one missing field repeats across every document. Keep ONE
  // document per group: grouping strips the filename, and a finding nobody can
  // reproduce is a finding nobody fixes. The example is the FIRST document that
  // produced the group, so it is stable across runs.
  const counts = new Map()
  for (const f of findings) {
    const file = /^([^:]+\.crv): /.exec(f)?.[1] ?? null
    const key = f.replace(/^[^:]+\.crv: /, '').replace(/at \$[^\s]*/, 'at <path>')
    const seen = counts.get(key)
    if (seen) seen.n += 1
    else counts.set(key, { n: 1, example: file })
  }
  console.log(`${label}: ${findings.length} findings, ${counts.size} distinct`)
  const ranked = [...counts].sort((a, b) => b[1].n - a[1].n)
  for (const [key, entry] of ranked.slice(0, DISPLAY_LIMIT)) {
    const where = entry.example ? '  [' + entry.example + ']' : ''
    console.log(`  ${String(entry.n).padStart(4)}x ${key}${where}`)
  }
  // Say so when the display is truncated. This used to end here, so a run with
  // nine distinct findings looked exactly like a run with eight.
  const hidden = ranked.length - DISPLAY_LIMIT
  if (hidden > 0) {
    console.log(`  ... and ${hidden} more distinct finding${hidden === 1 ? '' : 's'} not shown`)
  }
  console.log('')
}

// A closing statement of what was NOT measured, so the coverage of a run is
// visible at the end rather than inferable from the middle. Without this the
// only signal was one line per engine, several screens up.
if (notMeasured.length > 0) {
  console.log(`NOT MEASURED: ${notMeasured.length} of 3 satellites - ${notMeasured.join(', ')}`)
  console.log('These engines were not checked at all. This is not a pass.\n')
  // Opt-in, because the sibling checkouts are not present by default and a
  // developer running this on carve-js alone should not be failed for it. Once
  // CI has the checkouts it should set this, so an engine silently dropping out
  // of the matrix is a red build rather than a line of prose (carve#475).
  if (process.env.CARVE_REQUIRE_ALL_ENGINES === '1') {
    console.error('CARVE_REQUIRE_ALL_ENGINES=1 and at least one engine was not measured.')
    process.exit(1)
  }
} else {
  console.log('All satellites measured.\n')
}

// §1a GATES. Every other finding class here is reported and counted; this one
// fails the run, because it is the only PART 12 rule the schema cannot express
// (JSON Schema cannot forbid two adjacent array entries of the same shape) and
// therefore the only one with no other line of defence. It went unmeasured long
// enough for carve-php to publish 107 runs across 56 corpus documents and
// carve-rs 18 across 6, while both validated cleanly against the schema and
// passed every gate the project ran.
//
// A flat zero rather than a ratchet against recorded counts: a ratchet makes a
// rule that is currently violated look like a rule that is currently enforced,
// which is the same failure one level up.
// PROVENANCE BEFORE THE GATE. These two roll-ups used to sit after the §1a
// exit below, which meant they never printed on any run that had §1a findings
// -- the exact runs whose numbers most need attributing, and the reason the
// carve#534 audit could not tell a reference defect from a dirty checkout.
//
// A stale build is not a skip and not a pass: it is a NUMBER produced by code
// nobody is running any more. Say so at the end, where the not-measured roll-up
// already is, rather than leaving it to be noticed in a label several screens up.
if (jsProv.offPin) {
  console.log(
    'REFERENCE OFF PIN: ../carve-js is not the build package.json pins, so every',
  )
  console.log(
    '  "tree differs from the reference" line above describes that checkout, not the pin.\n',
  )
}

if (staleBuilds.length > 0) {
  console.log(`STALE BUILDS: ${staleBuilds.join(', ')} - findings above are from an OLD build.`)
  console.log('Rebuild those engines and re-run before recording any number from this run.\n')
  if (process.env.CARVE_REQUIRE_ALL_ENGINES === '1') {
    console.error('CARVE_REQUIRE_ALL_ENGINES=1 and at least one engine was measured from a stale build.')
    process.exit(1)
  }
}

if (adjacentTextRunCounts.length > 0) {
  const total = adjacentTextRunCounts.reduce((n, e) => n + e.count, 0)
  console.error(
    `PART 12 §1a: ${total} adjacent text run(s) published (${adjacentTextRunCounts
      .map((e) => `${e.label} ${e.count}`)
      .join(', ')}).`,
  )
  console.error("A node's children must hold no two adjacent text nodes.")
  process.exit(1)
}

