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

import { execFileSync as nodeExecFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { classifyShapeDisagreement, shapeOf, shapePaths } from './spec/ast-shape.mjs'
import { compareValues, reconcileDeclared, valueSignature } from './spec/ast-values.mjs'
import { compareSpans, countPlaced, reconcileSpans, spanSignature } from './spec/ast-spans.mjs'
import {
  describeDocuments,
  groupFindings,
  notReconciledBecause,
  parseExtentDeclarations,
  parseWaivers,
  partitionFindings,
} from './spec/ast-waivers.mjs'
import { checkPositions } from './spec/ast-positions.mjs'
import { replaceNulls } from './spec/layout.mjs'
import { checkReferenceFields } from './spec/ast-references.mjs'
import {
  UNKNOWN_PROPERTY_PROBE,
  unknownPropertyVerdict,
  countProbes,
  injectUnknownProperty,
} from './spec/unknown-property-probe.mjs'
import { refusableRootShapes, rootShapeVerdict } from './spec/root-shape-probe.mjs'
import { miscount, shortfall } from './spec/participants.mjs'
import { rustBinary } from './lib/engine-locations.mjs'

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
/*
 * How much output a per-document subprocess may produce.
 *
 * execFileSync defaults to 1 MB and REJECTS past it, so the runner used to
 * report `spawnSync php ENOBUFS` as a carve-php finding on
 * 182-openers-past-the-nesting-cap-are-one-paragraph - a document whose
 * serialized tree is larger than that. The engine was fine; the buffer was the
 * runner's. Worse, the document then dropped out of the three-way comparison
 * with two votes left, so the run counted a harness limit as an engine defect
 * AND quietly stopped comparing the one document most likely to expose one.
 */
/*
 * How many documents get the unknown-property probe. It costs one extra
 * subprocess per document per engine, and the property under test is a codec
 * property rather than a per-document one - the same answer on every tree. The
 * count is printed with the finding-free line below so a sample can never read
 * as the whole corpus.
 */
const UNKNOWN_PROPERTY_SAMPLE = Number(process.env.CARVE_UNKNOWN_PROBE_SAMPLE ?? 6)

const MAX_SUBPROCESS_OUTPUT = 256 * 1024 * 1024
const SUBPROCESS_TIMEOUT_MS = 15_000
const execFileSync = (file, args, options = {}) => nodeExecFileSync(file, args, {
  timeout: SUBPROCESS_TIMEOUT_MS,
  ...options,
})

function progress(engine, index, total, name) {
  if (index === 0 || (index + 1) % 100 === 0 || index + 1 === total) {
    console.log(`[${engine}] ${index + 1}/${total}: ${name}`)
  }
}

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
 * Gate failures that must not exit where they are DETECTED.
 *
 * The rule this file already follows for its roll-ups - see the comment
 * beginning "PROVENANCE BEFORE THE GATE" near the end - is that a gate placed
 * above a measurement silently deletes that measurement from every run the gate
 * fires on. The binding-parity gate was doing exactly that: it sits between
 * carve-rb and carve-php, so a stale carve-rb pin, which its own comment calls
 * the usual case, ended the process before carve-php was measured at all,
 * before the three-way panel ran, and before the NOT MEASURED and STALE BUILDS
 * roll-ups printed.
 *
 * That is worse than a missed gate. CARVE_REQUIRE_ALL_ENGINES=1 exists so an
 * engine dropping out of the matrix is a red build rather than a line of prose
 * (carve#475), and under the early exit that flag was what caused the drop: on
 * run 32409466637 the report carried carve-js, carve-rs and carve-rb, no
 * carve-php section, and no skip line saying why.
 *
 * So the message still prints exactly where it is found, and the EXIT waits
 * until every engine has been measured. Drained at the bottom of this file.
 */
const deferredGateFailures = []


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
 * Every engine's SCALAR-field signatures, per document. The shape map beside
 * this one answers whether the engines build the same tree; this one answers
 * whether they put the same values in it (carve#786).
 */
const engineValues = new Map()

/** Every engine's SPAN signature per document, for `reportSpanDisagreements`. */
const engineSpans = new Map()

/**
 * Every independent engine's tree signature, kept so the run can compare the
 * engines to EACH OTHER and not only to the one that was chosen as reference.
 *
 * `checkShapeParity` above measures agreement with carve-js, which means a
 * carve-js defect is unfalsifiable here: when the reference is the odd one out,
 * the run reports it as two engines failing (carve#747). Two were found by hand
 * that this could not surface - a reference image with a caption serialized as a
 * paragraph while the same engine's HTML said figure (carve-js#680), and the
 * generated heading id carried in the tree against §3a, which differed on 41 of
 * 610 documents (carve-js#697).
 *
 * carve-rb is deliberately NOT in the panel: it serializes carve-rs's tree, so
 * counting it would give that engine two votes and make a real carve-rs
 * divergence look like a majority.
 */
/**
 * Where the engines publish DIFFERENT VALUES in the same node.
 *
 * Separate from the shape panel because it answers a separate question, and
 * separate from the schema check because every field involved is optional there
 * - a tree that omits `align` validates exactly as well as one that carries it.
 *
 * GATES against resources/ast-value-divergence.txt, which declares the known
 * ones with a DOCUMENT COUNT each. This used to report and gate nothing, on the
 * grounds that a gate would fail on day one for reasons already tracked - true,
 * and the same shape as a check that cannot fail: the numbers moved and nothing
 * said so. Declaring the debt keeps both halves, and the count makes the
 * declaration fail in three directions rather than one (carve#786).
 *
 * Grouped by `type.field` rather than by document because each of these is one
 * field behaving one way everywhere it appears: a per-document list is 107
 * entries describing five facts, and a node path churns on every corpus
 * insertion.
 */
function reportValueDisagreements(present) {
  const byKey = new Map()
  const names = engineValues.get(present[0])
  if (!names) return

  for (const name of names.keys()) {
    const signatures = new Map()
    let complete = true
    for (const engine of present) {
      const sig = engineValues.get(engine)?.get(name)
      if (!sig) { complete = false; break }
      signatures.set(engine, sig)
    }
    if (!complete) continue

    for (const found of compareValues(signatures, name)) {
      if (!byKey.has(found.key)) byKey.set(found.key, { engines: found.engines, docs: [] })
      byKey.get(found.key).docs.push(found.sample)
    }
  }

  console.log('')
  if (byKey.size === 0) {
    console.log('THREE-WAY VALUE COMPARISON: the engines publish the same values everywhere.')
  } else {
    const total = new Set([...byKey.values()].flatMap((v) => v.docs)).size
    console.log(
      `THREE-WAY VALUE COMPARISON: ${byKey.size} field(s) disagree, across ${total} document(s)`,
    )
    for (const [key, { engines, docs }] of [...byKey].sort(
      (a, b) => b[1].docs.length - a[1].docs.length,
    )) {
      const who = Object.entries(engines).map(([e, v]) => `${e}=${v}`).join('  ')
      console.log(`  ${String(new Set(docs).size).padStart(4)} doc(s)  ${key}`)
      console.log(`        ${who}`)
      console.log(`        e.g. ${docs.slice(0, 2).join(', ')}`)
    }
  }

  // RECONCILED UNCONDITIONALLY. The early return that used to sit above this -
  // taken whenever `byKey` was empty - made the declaration's own "a listed
  // field no longer diverges -> delete the line" direction unreachable in
  // exactly the state it describes. See `reconcileDeclared` (carve#534).
  //
  // DOCUMENTS, not occurrences: `heading.attrs.id` diverged 72 times across 56
  // documents, and a declaration whose unit disagrees with its own header is a
  // number nobody can check.
  const problems = reconcileDeclared(
    new Map([...byKey].map(([key, { docs }]) => [key, new Set(docs)])),
    readFileSync(VALUE_DIVERGENCE_FILE, 'utf8'),
  )

  // ACCUMULATED, not exited on. This used to `process.exit(1)` here, which
  // meant the FIRST declaration to drift was the only one a run could report -
  // the span panel below and the position waivers after it never printed, so
  // fixing one drift revealed the next instead of showing all three at once.
  // Same family as the early return this function's own reconciliation had.
  declarationDrift.push({
    file: 'resources/ast-value-divergence.txt',
    what: 'THREE-WAY VALUE COMPARISON',
    problems,
    advice: [
      'Each line there is a field the engines disagree about, with the number of',
      'documents it shows up in. Update it in the commit that moves the number.',
    ],
  })

  if (byKey.size > 0) {
    console.log('  All declared in resources/ast-value-divergence.txt (carve#786).')
  } else {
    console.log('  resources/ast-value-divergence.txt declares nothing that still diverges.')
  }
}

/**
 * Where the engines disagree about a SPAN.
 *
 * The panel `ast-values.mjs` explicitly excludes ("compared elsewhere") and
 * `checkPositions` does not supply: it compares each engine against the SOURCE,
 * never against another engine, and its one content-level rule runs on `text`
 * alone. See scripts/spec/ast-spans.mjs for the two live defects that hid
 * behind that gap and why neither is reachable by asserting what a span slices
 * to (carve#534).
 *
 * DECLARED, not gated at zero, for the reason the value panel gives one screen
 * up: in this fleet a fix lands in one engine first, so the engine that is
 * RIGHT is routinely the odd one out for a while, and gating at zero would make
 * the fix for a red run "wait". A declared count still fails the moment an
 * engine changes its mind about a span, which nothing else here can see.
 *
 * IT NOW NAMES A SIDE, AND THERE ARE TWO OF THEM. Whether a span covers the
 * markup that opens a node was markup-carve/carve#913, and §4 answers it
 * markup-inclusive - so an extent row is an engine owing a fix rather than an
 * open convention. What the panel still does not do is say WHICH engine owes
 * it: that needs the source, and WHICH source-side rule applies depends on
 * which END of the span moved. `checkOpeningMarkup` tests where a span BEGINS;
 * `checkStopsAtChildren`, over the types in `ENDS_AT_LAST_CHILD`, tests where
 * it ENDS. Both live in scripts/spec/ast-positions.mjs and each engine's
 * `report` runs both against its own tree.
 *
 * The advice below used to name only the first, so a row with a unanimous
 * `startOffset` differing at the END read as "the narrow engine moves" when the
 * rule for that end says the WIDE one does - carve#1637, where six of eight
 * rows were end-only and the text pointed at the one engine with no end-side
 * finding at all.
 *
 * THE START HALF HAD THE SAME DEFECT, one ruling later. It told the reader that
 * a row differing only inside the leading indentation was owed by nobody, which
 * was true while `checkOpeningMarkup` walked that run for every type. carve#1928
 * withdrew the latitude from LEAF types, so on those rows the engine starting in
 * the indent does owe it - and the old text named carve-php, the engine that
 * begins at the markup, as the one to change. Both halves now say which side
 * only after the row says which rule applies.
 */
function reportSpanDisagreements(present) {
  const byKey = new Map()
  const names = engineSpans.get(present[0])
  if (!names) return

  // THE OPT-IN TRAP. Positions are behind a parse option in carve-rs and
  // carve-php. An engine invoked without it publishes a tree with no `pos`
  // anywhere, and every comparison below would then be absent-against-absent
  // and unanimous - a clean panel that measured nothing. Assert each engine
  // PLACED something before believing any of it.
  const placed = new Map(present.map((engine) => [engine, 0]))
  for (const engine of present) {
    for (const signature of engineSpans.get(engine).values()) {
      placed.set(engine, placed.get(engine) + countPlaced(signature))
    }
  }
  const silent = present.filter((engine) => placed.get(engine) === 0)
  if (silent.length > 0) {
    console.error('')
    console.error(
      `THREE-WAY SPAN COMPARISON cannot run: ${silent.join(', ')} published no position at all.`,
    )
    console.error('Positions are an opt-in parse option in carve-rs and carve-php, so a run that')
    console.error('did not request them compares absence against absence on every node and calls')
    console.error('it agreement. That is not a pass; it is the checker measuring nothing.')
    process.exit(1)
  }

  for (const name of names.keys()) {
    const signatures = new Map()
    let complete = true
    for (const engine of present) {
      const sig = engineSpans.get(engine)?.get(name)
      if (!sig) { complete = false; break }
      signatures.set(engine, sig)
    }
    if (!complete) continue

    for (const found of compareSpans(signatures, name)) {
      if (!byKey.has(found.key)) byKey.set(found.key, { engines: found.engines, docs: new Set() })
      byKey.get(found.key).docs.add(found.sample)
    }
  }

  console.log('')
  const totalPlaced = [...placed.values()].reduce((a, b) => a + b, 0)
  if (byKey.size === 0) {
    console.log(
      `THREE-WAY SPAN COMPARISON: the engines place every node identically (${totalPlaced} span(s) compared).`,
    )
  } else {
    const total = new Set([...byKey.values()].flatMap((v) => [...v.docs])).size
    console.log(
      `THREE-WAY SPAN COMPARISON: ${byKey.size} row(s) disagree, across ${total} document(s) ` +
        `(${totalPlaced} span(s) compared)`,
    )
    for (const [key, { engines, docs }] of [...byKey].sort((a, b) => b[1].docs.size - a[1].docs.size)) {
      const who = Object.entries(engines).map(([e, v]) => `${e}=${v}`).join('  ')
      console.log(`  ${String(docs.size).padStart(4)} doc(s)  ${key}`)
      console.log(`        e.g. ${[...docs][0]}: ${who}`)
    }
    console.log('  EXTENT rows are PART 12 §4, and WHICH END moved decides which engine owes it:')
    console.log('    startOffset differs - a span "begins at the markup that opens the construct",')
    console.log('      so the engine that starts LATER, at the markup, is the conformant one and')
    console.log('      the earlier engine moves (carve#913, checkOpeningMarkup).')
    console.log('      WHERE THE STARTS DIFFER ONLY INSIDE THE LEADING INDENTATION, the type')
    console.log('      decides: a CONTAINER may begin part way into that run at its parent\'s')
    console.log('      content column, so no engine owes the row; a LEAF begins at its markup, so')
    console.log('      the engine starting in the indent owes it (carve#1928,')
    console.log('      INDENT_LATITUDE in scripts/spec/ast-positions.mjs).')
    console.log('    endOffset differs, startOffset unanimous - a span "ends immediately after the')
    console.log('      last source codepoint the construct owns", and a container with no closer ends')
    console.log('      at its last child, so the WIDE engine moves (checkStopsAtChildren, over the')
    console.log('      types in ENDS_AT_LAST_CHILD). Read the "e.g." line to see which end moved.')
  }

  const problems = reconcileSpans(
    new Map([...byKey].map(([key, { docs }]) => [key, docs])),
    readFileSync(SPAN_DIVERGENCE_FILE, 'utf8'),
  )
  declarationDrift.push({
    file: 'resources/ast-span-divergence.txt',
    what: 'THREE-WAY SPAN COMPARISON',
    problems,
    advice: [
      'Each line there is a node type the engines span differently, with the number of',
      'documents it shows up in. Update it in the commit that moves the number.',
      'A row moving does not say WHICH engine is wrong - this panel has the trees and not',
      'the source - and WHICH RULE names a side depends on WHICH END of the span moved.',
      'PART 12 §4 has two sentences and they point at different checkers:',
      '  START. A span "begins at the markup that opens the construct"',
      '  (markup-carve/carve#913), so the engine that starts EARLIER - short of the markup -',
      '  is the one that moves. checkOpeningMarkup in scripts/spec/ast-positions.mjs is the',
      '  source-side rule, and it does NOT name one side for every row: where the starts',
      '  differ only inside the line\'s LEADING INDENTATION the TYPE decides. A CONTAINER may',
      '  begin part way into that run, at its parent\'s content column, because the run is',
      '  what places its marker - there both readings pass and neither engine owes the row.',
      '  A LEAF has no marker to place, so it begins at the markup and the engine starting',
      '  in the indent owes it (markup-carve/carve#1928; the set is INDENT_LATITUDE).',
      '  Read the node TYPE off the row before naming a side. Reading every indent row as',
      '  "nobody owes it" named carve-php, which begins at the markup, as the one to change',
      '  on 444-an-opener-at-or-past-a-description-body-s-column-closes-its-paragraph-9.',
      '  END. A span "ends immediately after the last source codepoint the construct owns",',
      '  and a container with no closer "ends at its last child", so on those rows the WIDE',
      '  engine is the one that moves. checkStopsAtChildren, over the types in',
      '  ENDS_AT_LAST_CHILD, is the source-side rule, and what it finds is declared in',
      '  resources/ast-extent-findings.txt.',
      'A row whose engines agree on startOffset and differ on endOffset is the SECOND case.',
      'Reading it as the first blames the narrow engine, which is the exact inverse',
      '(carve#1637): six of eight rows were end-only, and the advice pointed at carve-js -',
      'the one engine with no span-reaches-past-its-last-child finding at all.',
    ],
  })
  if (byKey.size > 0) {
    console.log('  All declared in resources/ast-span-divergence.txt (carve#534).')
  }
}

const VALUE_DIVERGENCE_FILE = resolve(here, '..', 'resources', 'ast-value-divergence.txt')
const SPAN_DIVERGENCE_FILE = resolve(here, '..', 'resources', 'ast-span-divergence.txt')
const POSITION_WAIVER_FILE = resolve(here, '..', 'resources', 'ast-position-waivers.txt')
const EXTENT_FINDING_FILE = resolve(here, '..', 'resources', 'ast-extent-findings.txt')

/*
 * The position declaration, read ONCE and up front.
 *
 * A malformed line is a hard stop rather than a skipped line: `permitted` is
 * the status that silences a finding, so a typo that made a line unparseable
 * would silently un-declare a waiver and, one direction over, a typo in the
 * engine or document field would leave a real finding UNWAIVED with a
 * confusing message. Neither should be reachable without the run saying so.
 */
const { declared: declaredWaivers, errors: waiverFileErrors } = parseWaivers(
  readFileSync(POSITION_WAIVER_FILE, 'utf8'),
)
if (waiverFileErrors.length > 0) {
  console.error('resources/ast-position-waivers.txt is malformed:')
  for (const e of waiverFileErrors) console.error(`  ${e}`)
  process.exit(2)
}

/*
 * The §4 EXTENT declaration, read the same way and for the same reason.
 *
 * A malformed line here is a hard stop too, and the status field is stricter
 * than the waiver file's: there is no `permitted`, so a typo cannot quietly
 * turn a violation into a permitted one. It can only fail.
 */
const { declared: declaredExtents, errors: extentFileErrors } = parseExtentDeclarations(
  readFileSync(EXTENT_FINDING_FILE, 'utf8'),
)
if (extentFileErrors.length > 0) {
  console.error('resources/ast-extent-findings.txt is malformed:')
  for (const e of extentFileErrors) console.error(`  ${e}`)
  process.exit(2)
}

/** Accumulated across every engine's `report`, gated at the end of the run. */
const waiverProblems = []

/** The same, for the extent ledger and for the findings no ledger covers. */
const extentDriftProblems = []
const ungatedProblems = []

/*
 * The cross-engine shape diffs, per engine, rolled up at the end of the run.
 *
 * They are NOT gated - `reportEngineDisagreement` states the policy for that
 * whole family below - but they must not be silent either, which is the defect
 * carve#1637 is about. Counted here, named on each engine's summary line, and
 * printed once at the end so a reader knows the number exists and which panel
 * owns it.
 */
const referenceShapeCounts = []

/**
 * Every declaration this run reconciles, gated together at the end.
 *
 * ONE gate for three files, because each of them used to exit the process
 * itself: the value panel's exit ran before the span panel had printed, and
 * both ran before any position waiver was reconciled. So a run with drift in
 * all three reported one, and fixing it revealed the next - the numbers a
 * reader most needs side by side are exactly the ones that could not appear
 * together (carve#534).
 */
const declarationDrift = []

const INDEPENDENT_ENGINES = ['carve-js', 'carve-rs', 'carve-php']
let panelRan = false
const enginePaths = new Map()

function recordShape(engine, name, doc) {
  let perDoc = enginePaths.get(engine)
  if (!perDoc) {
    perDoc = new Map()
    enginePaths.set(engine, perDoc)
  }
  perDoc.set(name, shapePaths(shapeOf(doc)).join('\n'))

  // The same tree, signed a second way. `shapeOf` drops every scalar, so this
  // is what carries `align`, `href`, `order` and the rest to the panel below
  // (carve#786).
  let perDocValues = engineValues.get(engine)
  if (!perDocValues) {
    perDocValues = new Map()
    engineValues.set(engine, perDocValues)
  }
  perDocValues.set(name, valueSignature(doc))

  // The same tree, signed a THIRD way. `shapeOf` drops scalars and
  // `valueSignature` drops the position keys by name, so before this nothing
  // carried a span into any cross-engine comparison at all (carve#534).
  let perDocSpans = engineSpans.get(engine)
  if (!perDocSpans) {
    perDocSpans = new Map()
    engineSpans.set(engine, perDocSpans)
  }
  perDocSpans.set(name, spanSignature(doc))
}

/**
 * Name the engine that stands alone on a document, whichever engine it is.
 *
 * WHAT THIS CAN SEE: `shapeOf` keeps node types and nested structure, so an
 * extra object field (`attrs` where the source has no `{`), a different node
 * type, or a different number of children all show up. WHAT IT CANNOT: a scalar
 * field, because shapeOf drops scalars - a missing `number` or a different `id`
 * is invisible here and belongs to the schema and the field-level checks. Said
 * out loud because a panel that looks broader than it is would be worse than no
 * panel: the run would read as "the engines agree" when it only means "the
 * engines agree about shape".
 *
 * Returns the number of documents on which the REFERENCE stood alone, which is
 * the class this whole panel exists for.
 */
function reportEngineDisagreement() {
  const present = INDEPENDENT_ENGINES.filter((engine) => enginePaths.has(engine))
  if (present.length < INDEPENDENT_ENGINES.length) {
    const missing = INDEPENDENT_ENGINES.filter((engine) => !enginePaths.has(engine))
    console.log(`THREE-WAY COMPARISON NOT RUN: ${missing.join(', ')} contributed no trees.`)
    console.log('  A majority needs three independent engines. This is not a pass.\n')

    return 0
  }

  panelRan = true
  const alone = new Map(present.map((engine) => [engine, []]))
  const threeWay = []
  let unanimous = 0
  let compared = 0
  let skipped = 0
  for (const name of enginePaths.get(INDEPENDENT_ENGINES[0]).keys()) {
    const verdict = classifyShapeDisagreement(
      present.map((engine) => [engine, enginePaths.get(engine).get(name)]),
    )
    if (verdict.kind === 'skipped') {
      skipped += 1
      continue
    }
    compared += 1
    if (verdict.kind === 'unanimous') unanimous += 1
    else if (verdict.kind === 'alone') alone.get(verdict.engine).push(name)
    else threeWay.push(name)
  }

  console.log(`THREE-WAY SHAPE COMPARISON (${compared} documents, ${unanimous} unanimous)`)
  for (const engine of present) {
    const docs = alone.get(engine)
    if (docs.length === 0) continue
    console.log(`  ${engine} stood alone on ${docs.length}: ${examples(docs)}`)
  }
  if (threeWay.length > 0) {
    console.log(`  all three differed on ${threeWay.length}: ${examples(threeWay)}`)
  }
  if (compared === unanimous) console.log('  no engine stood alone.')

  reportValueDisagreements(present)
  reportSpanDisagreements(present)

  // A document one engine could not serialize leaves the panel with two votes,
  // so it is not compared. Say how many, or a run where half the corpus dropped
  // out reads the same as one where none did.
  if (skipped > 0) {
    console.log(`  ${skipped} document(s) not compared - an engine produced no tree for them.`)
  }
  console.log('')

  return alone.get('carve-js').length
}

/**
 * Up to three names, and a count for the rest. A single example is enough to
 * reproduce one finding and not enough to see a pattern, which matters most
 * here: three documents that share a cause are one defect, and three that do
 * not are three.
 */
function examples(names) {
  const shown = names.slice(0, 3).join(', ')

  return names.length > 3 ? `${shown} (+${names.length - 3} more)` : shown
}

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

function checkDocument(name, doc, raw, findings) {
  // MEASURE AGAINST THE SOURCE THE ENGINE READ, NOT THE FIXTURE BYTES.
  //
  // PART 0 INPUT replaces every U+0000 with U+FFFD before the first line is
  // read, one codepoint for one, so a node's text holds the replacement where
  // the fixture holds the byte. Slicing the raw fixture reported
  // `397-a-null-byte-is-replaced-before-the-document-is-read.crv` as a bad span
  // on EVERY engine while every offset in it was right - and a finding that is
  // identical across engines is one the three-way panel cannot surface as a
  // divergence, so it reads exactly like a unanimous defect (carve#1531).
  //
  // ONLY this transform is applied, which is the precedent
  // `tests/ast-positions.test.mjs` set for the same reason: the BOM strip and
  // the line-ending fold change LENGTH, and the engines report positions
  // against the source as it arrived, so applying those would move every offset
  // in a CRLF or BOM'd document (carve#876).
  //
  // The engines are still fed `raw`. Handing them the replaced text instead
  // would compare a document none of them was asked to read, and would retire
  // the corpus case's whole subject - whether the engine performs the
  // replacement itself.
  //
  // Here rather than at the four call sites, because this script measures four
  // engines in four separate loops and a fifth is a plausible next commit: one
  // choke point cannot be half-applied.
  const source = replaceNulls(raw)
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
  // §3a's source-shape half cannot run on a node with no usable position, so it
  // goes quiet on exactly the nodes an engine failed to place. Counted rather
  // than reported - the missing position is checkPositions' finding - and rolled
  // up at the end of the run, because a rule that silently stopped covering part
  // of the corpus reads identically to one that found nothing (carve#534).
  referenceCoverageGaps += checkReferenceFields(doc, source, own)
  for (const f of own) findings.push(name.endsWith('.crv') ? name + ': ' + f : f)
}

/** Referencing nodes §3a's source-shape rule could not be applied to. */
let referenceCoverageGaps = 0

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

const corpusFiles = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()
const samples = [
  ...ASTRAL_SAMPLES,
  ...corpusFiles
    .slice(0, limit)
    .map((f) => ({ name: f, source: readFileSync(resolve(corpusDir, f), 'utf8') })),
]

/*
 * HOW MANY DOCUMENTS THIS RUN ACTUALLY SAW, checked rather than printed.
 *
 * `--limit=0` produces a run over the three synthetic astral samples and NO
 * corpus at all, and every engine then reports its findings for those three as
 * though the corpus had been measured. A typo in a CI invocation, or a corpus
 * that failed to build, reads exactly like a clean run - carve#755's second
 * variant, "asserts over an empty set".
 *
 * Without a limit the run must see the WHOLE corpus, so the check is exact: a
 * filter that quietly starts dropping files fails here rather than shrinking the
 * question. With a limit it is a floor plus the sample notice already printed
 * below, because sampling is a deliberate act with a number attached.
 */
const corpusSeen = samples.length - ASTRAL_SAMPLES.length
const populationProblem = Number.isFinite(limit)
  ? shortfall({
      label: 'CORPUS',
      actual: corpusSeen,
      // max(1, ...): `--limit=0` compares no corpus document at all, which is a
      // typo rather than a sample size. It used to run and report per-engine
      // findings for the synthetic samples alone.
      atLeast: Math.max(1, Math.min(limit, corpusFiles.length)),
      of: 'corpus document(s)',
      hint: 'Pass a higher --limit, or drop it to run the whole corpus.',
    })
  : miscount({
      label: 'CORPUS',
      actual: corpusSeen,
      expected: corpusFiles.length,
      of: 'corpus document(s)',
    })
if (populationProblem !== null) {
  console.error(populationProblem)
  console.error('Nothing below describes the corpus this repository ships.')
  process.exit(2)
}
if (corpusFiles.length < 100) {
  console.error(
    `CORPUS: tests/corpus holds ${corpusFiles.length} document(s), which is too few to be ` +
      'the shared corpus - run `npm run corpus:build`, or check the checkout.',
  )
  process.exit(2)
}

const satelliteSamples = samples.slice(0, satelliteLimit)

// Both numbers, because they are different populations: the astral samples are
// synthetic inputs this script carries, not documents the corpus ships, and
// folding them into one count made a run over three synthetic cases read as a
// run over three corpus documents.
console.log(
  `PART 12 conformance over ${corpusSeen} corpus document(s) ` +
    `plus ${ASTRAL_SAMPLES.length} synthetic sample(s)\n`,
)

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

// The READER, for the same reason and in the same place. §6 is a round trip, so a
// build with only half of it cannot be measured against the clause - and a
// missing reader must not turn into a skipped check inside the loop, which would
// report the reference as conformant on the half it never ran.
if (typeof lib.fromAstJson !== 'function') {
  console.error(`the build at ${jsDir} has no fromAstJson - PART 12 §6 cannot be checked.`)
  process.exit(2)
}

const jsFindings = []
let jsProbed = 0
let jsRootShaped = false
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
  recordShape('carve-js', name, doc)

  // PART 12 §6: serialize then DESERIALIZE must equal the parse. Through the
  // engine's own reader - `fromAstJson` - which is the half the clause is about.
  //
  // This used to compare `JSON.parse(JSON.stringify(doc))` against `doc`, which
  // is a statement about JSON.stringify and not about this engine: it can only
  // fail on a value JSON cannot represent, so the ingest half of §6 was
  // unmeasured for every document while the report said it was checked.
  let round
  try {
    round = lib.toAstJson(lib.fromAstJson(JSON.parse(JSON.stringify(doc))))
  } catch (error) {
    jsFindings.push(`${name}: ingest threw on this engine's own output - ${error.message}`)
    continue
  }
  if (jsProbed < UNKNOWN_PROPERTY_SAMPLE) {
    jsProbed += 1
    checkUnknownPropertyIngest(name, doc, jsFindings, (payload) =>
      JSON.stringify(lib.toAstJson(lib.fromAstJson(JSON.parse(payload)))),
    )
  }
  if (!jsRootShaped) {
    jsRootShaped = true
    checkRootShapeIngest(
      name,
      doc,
      jsFindings,
      (payload) => lib.fromAstJson(JSON.parse(payload)),
      typeof lib.renderHtml === 'function'
        ? (payload) => lib.renderHtml(lib.fromAstJson(JSON.parse(payload)))
        : undefined,
    )
  }
  if (JSON.stringify(round) !== JSON.stringify(doc)) {
    jsFindings.push(`${name}: §6 round trip through fromAstJson is not identity`)
  }
}
const jsProv = referenceProvenance(jsDir)
if (jsProv.suspect) staleBuilds.push('carve-js (reference)')
report('carve-js', `carve-js (reference) [${jsProv.text}]`, jsFindings)

// ---- carve-rs: serializes through its own `carve --json` --------------------
//
// Reached DIRECTLY now rather than only through carve-rb. The binding used to be
// the only route, which meant a finding could belong to either side and the
// report could not say which - and any engine over carve-rs that is not Ruby
// (carve-go, carve-py, carve-wasm) was measured by proxy or not at all.
//
// Uses an already-built binary rather than `cargo run`, so a checkout that has
// not been built says so instead of silently compiling for two minutes.
const rsBinary = rustBinary(rsDir)
if (rsBinary) {
  const rsFindings = []
let rsProbed = 0
let rsRootShaped = false
  for (const [index, { name, source }] of satelliteSamples.entries()) {
    progress('rust', index, satelliteSamples.length, name)
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
          maxBuffer: MAX_SUBPROCESS_OUTPUT,
        }),
      )
    } catch (error) {
      rsFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(name, doc, source, rsFindings)
    // §6 through this engine's own reader, which nothing checked for any engine
    // but the reference - and there vacuously (see the note in the js section).
    // `--from-json --json` is serialize(ingest(serialize(parse(x)))), so an
    // identity here is the clause's property stated in the engine's own terms.
    checkIngestIdentity(name, doc, rsFindings, (payload) =>
      execFileSync(rsBinary, ['--from-json', '--json', '-'], {
        input: payload,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: MAX_SUBPROCESS_OUTPUT,
      }),
    )
    if (rsProbed < UNKNOWN_PROPERTY_SAMPLE) {
      rsProbed += 1
      checkUnknownPropertyIngest(name, doc, rsFindings, (payload) =>
        execFileSync(rsBinary, ['--from-json', '--json', '-'], {
          input: payload,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: MAX_SUBPROCESS_OUTPUT,
        }),
      )
    }
    if (!rsRootShaped) {
      rsRootShaped = true
      const run = (args) => (payload) =>
        execFileSync(rsBinary, args, {
          input: payload,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: MAX_SUBPROCESS_OUTPUT,
        })
      checkRootShapeIngest(
        name,
        doc,
        rsFindings,
        run(['--from-json', '--json', '-']),
        run(['--from-json', '-']),
      )
    }
    checkShapeParity(name, doc, rsFindings)
    recordShape('carve-rs', name, doc)
  }
  const rsBuild = buildStatus(rsBinary, resolve(rsDir, 'src'), ['.rs'])
  if (rsBuild.stale) staleBuilds.push('carve-rs')
  report(
    'carve-rs',
    `carve-rs (over ${rsBinary.replace(rsDir + '/', '')} [${rsBuild.text}], ${satelliteSamples.length} documents)`,
    rsFindings,
  )
} else if (existsSync(rsDir)) {
  skip('carve-rs', 'checkout found but not built - run cargo build --release there')
} else {
  skip('carve-rs', 'checkout not found')
}

// ---- carve-rb: serializes carve-rs's tree ----------------------------------
const rbShapes = new Map()
if (existsSync(resolve(rbDir, 'lib/carve'))) {
  const rbFindings = []
  for (const [index, { name, source }] of satelliteSamples.entries()) {
    progress('ruby', index, satelliteSamples.length, name)
    let doc
    try {
      const out = execFileSync(
        'ruby',
        // `max_nesting: false`. Ruby's JSON.generate refuses past 100 levels by
        // default, and the corpus deliberately holds documents deeper than
        // that - so this probe raised JSON::NestingError and the run reported
        // "carve-rb: could not serialize" for a document the binding parses
        // perfectly well. The finding named the wrong component: nothing in
        // carve-rb or carve-rs was involved (carve#868).
        [
          '-Ilib',
          '-e',
          'require "carve"; require "json"; puts JSON.generate(Carve.parse(STDIN.read), max_nesting: false)',
        ],
        {
          cwd: rbDir,
          input: source,
          encoding: 'utf8',
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: MAX_SUBPROCESS_OUTPUT,
        },
      )
      doc = JSON.parse(out)
    } catch (error) {
      rbFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(name, doc, source, rbFindings)
    checkShapeParity(name, doc, rbFindings)
    rbShapes.set(name, shapePaths(shapeOf(doc)).join('\n'))
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
    'carve-rb',
    `carve-rb (over carve-rs [${rbBuild.text}], ${satelliteSamples.length} documents)`,
    rbFindings,
  )
} else {
  skip('carve-rb', 'checkout not found')
}

/*
 * BINDING PARITY, and this one IS a gate.
 *
 * Every per-engine finding above is reported and almost none of it is gated,
 * for a reason stated at the top of this file: a fix lands in one engine first
 * and is ported over the following days, so the engine that is RIGHT is
 * routinely the odd one out for a while.
 *
 * That is true of the three PEER engines. It is not true of carve-rb, and this
 * file already says why - it serializes carve-rs's tree, which is why counting
 * it in the panel would give that engine two votes. A binding over carve-rs
 * cannot be ahead of carve-rs. Every difference between the two trees is the
 * binding's: a stale pin, or a gap in the binding. There is no window in which
 * it is the one that is right.
 *
 * So this compares carve-rb against carve-rs SPECIFICALLY - not against the
 * reference, and not by folding it into the panel. The peer-engine rationale is
 * untouched; this only asserts in code what the file already asserts in prose.
 *
 * What the other two checks could not see (carve#868): the daily run reported a
 * 44-commit-stale pin and exited 0, and carve-rb's own corpus test compares
 * HTML byte-for-byte - which cannot see an AST-only change, because a link
 * reference definition renders nothing.
 */
const rsShapes = enginePaths.get('carve-rs')
if (rbShapes.size > 0 && rsShapes) {
  const drifted = []
  for (const [name, shape] of rbShapes) {
    const rs = rsShapes.get(name)
    if (rs !== undefined && rs !== shape) drifted.push(name)
  }
  const compared = [...rbShapes.keys()].filter((name) => rsShapes.has(name)).length
  if (drifted.length === 0) {
    console.log(`BINDING PARITY: carve-rb's tree matches carve-rs on all ${compared} shared document(s).\n`)
  } else {
    console.error(
      `BINDING PARITY: carve-rb's tree differs from carve-rs on ${drifted.length} of ${compared} document(s):`,
    )
    for (const name of drifted.slice(0, 10)) console.error(`  ${name}`)
    if (drifted.length > 10) console.error(`  … and ${drifted.length - 10} more`)
    console.error("A binding has no vote of its own - every one of these is carve-rb's, not carve-rs's.")
    console.error('Usually a stale `ext/carve/Cargo.toml` pin; rebuild the extension after bumping it.\n')
    // DEFERRED, not exited on. carve-php, the three-way panel and every closing
    // roll-up are all below this line; exiting here deleted them from the run.
    if (process.env.CARVE_REQUIRE_ALL_ENGINES === '1') {
      deferredGateFailures.push(
        `BINDING PARITY: carve-rb's tree differs from carve-rs on ${drifted.length} of ${compared} document(s).`,
      )
    }
  }
} else if (rbShapes.size > 0) {
  console.log('BINDING PARITY: not checked - carve-rs was not measured in this run.\n')
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
let phpProbed = 0
let phpRootShaped = false
  for (const [index, { name, source }] of satelliteSamples.entries()) {
    progress('php', index, satelliteSamples.length, name)
    let doc
    try {
      const out = execFileSync('php', ['bin/carve', '--json'], {
        cwd: phpDir,
        input: source,
        encoding: 'utf8',
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: MAX_SUBPROCESS_OUTPUT,
      })
      doc = JSON.parse(out)
    } catch (error) {
      phpFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(name, doc, source, phpFindings)
    checkShapeParity(name, doc, phpFindings)
    recordShape('carve-php', name, doc)
    checkIngestIdentity(name, doc, phpFindings, (payload) =>
      // No '-' argument: this CLI reads stdin when no file is given and
      // rejects a dash as an unknown option.
      execFileSync('php', ['bin/carve', '--from-json', '--json'], {
        cwd: phpDir,
        input: payload,
        encoding: 'utf8',
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: MAX_SUBPROCESS_OUTPUT,
      }),
    )
    if (phpProbed < UNKNOWN_PROPERTY_SAMPLE) {
      phpProbed += 1
      checkUnknownPropertyIngest(name, doc, phpFindings, (payload) =>
        execFileSync('php', ['bin/carve', '--from-json', '--json'], {
          cwd: phpDir,
          input: payload,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: MAX_SUBPROCESS_OUTPUT,
        }),
      )
    }
    if (!phpRootShaped) {
      phpRootShaped = true
      const run = (args) => (payload) =>
        execFileSync('php', ['bin/carve', ...args], {
          cwd: phpDir,
          input: payload,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: MAX_SUBPROCESS_OUTPUT,
        })
      checkRootShapeIngest(
        name,
        doc,
        phpFindings,
        run(['--from-json', '--json']),
        run(['--from-json']),
      )
    }
  }
  report(
    'carve-php',
    `carve-php (over bin/carve --json, ${satelliteSamples.length} documents)`,
    phpFindings,
  )
} else if (existsSync(phpDir)) {
  skip('carve-php', 'checkout found but bin/carve is missing')
} else {
  skip('carve-php', 'checkout not found')
}

/**
 * PART 12 §6 for an engine reached through its CLI.
 *
 * `serialize(x)` is fed back through the engine's own reader and serialized
 * again; §6 makes that an identity. Checked for every engine now: it was written
 * only for the reference, and there as a JSON.stringify round trip that could
 * not fail.
 */
/*
 * A tree an engine PUBLISHES must validate, whatever it chose to accept.
 *
 * PART 12 pins the wire shape with `additionalProperties: false`. The three
 * engines disagree about what to do with a property the schema does not name -
 * carve-php refuses the payload, carve-rs drops it, carve-js echoes it back
 * (carve-js#709) - and which of refuse-or-drop is right is an open question for
 * §9 (carve#743).
 *
 * This check does not touch that question. Refusing is a pass here and so is
 * dropping; what fails is ACCEPTING and then re-publishing, because the result
 * is a tree the format rejects, and the consumer that reads it and passes it on
 * has no way to know. Stated that way the bar follows from the schema contract
 * that already exists, so it can be enforced before the decision lands.
 *
 * The probe property is deliberately not a name the schema has ever had:
 * `refId` was found by hand precisely because it looked like a real field, and a
 * probe that could be mistaken for one would measure the wrong thing.
 */

function checkUnknownPropertyIngest(name, doc, findings, reserialize) {
  const payload = JSON.parse(JSON.stringify(doc))
  const injected = injectUnknownProperty(payload).n
  if (injected === 0) return
  let out
  let refused = false
  try {
    out = reserialize(JSON.stringify(payload))
  } catch {
    refused = true
  }
  let echoed = 0
  if (!refused) {
    let round
    try {
      round = JSON.parse(out)
    } catch {
      findings.push(`${name}: ingest of a tree with an unknown property re-serialized to non-JSON`)

      return
    }
    echoed = countProbes(round)
  }
  // The verdict lives in the probe module, where a test can drive every branch
  // without needing an engine that misbehaves.
  const verdict = unknownPropertyVerdict({ refused, injected, echoed })
  if (verdict !== null) findings.push(`${name}: ${verdict}`)
}

/*
 * PART 12 §12: the root shape an ingest may never repair.
 *
 * Two closures rather than one, because §12(c) is specifically about WHERE the
 * refusal happens. `decode` is the ingest on its own; `render` is ingest plus a
 * render. A payload the first accepts and the second rejects is the exact
 * defect the clause was written against - the caller is told about a rendering
 * problem, and a consumer that holds the tree without rendering it is told
 * nothing at all.
 *
 * Run ONCE per engine, not per document: every shape here is a mutation of the
 * ROOT or a foreign node grafted onto it, so a second document measures the
 * same rule again at the cost of another subprocess per shape.
 */
function checkRootShapeIngest(name, doc, findings, decode, render) {
  for (const shape of refusableRootShapes(doc)) {
    const payload = JSON.stringify(shape.payload)
    let refused = false
    let message = ''
    try {
      decode(payload)
    } catch (error) {
      refused = true
      // `stderr` as well as `message`: the two satellite engines report through
      // a CLI, so what they NAMED is on stderr while `message` only carries the
      // failed command line. Reading `message` alone would have made every CLI
      // refusal look unnamed.
      message = `${String(error?.stderr ?? '')}${String(error?.message ?? '')}`
    }
    let renderRefused = false
    if (!refused && render !== undefined) {
      try {
        render(payload)
      } catch {
        renderRefused = true
      }
    }
    const verdict = rootShapeVerdict({ shape, refused, renderRefused, message })
    if (verdict !== null) findings.push(`${name}: ${verdict}`)
  }
}

function checkIngestIdentity(name, doc, findings, reserialize) {
  const payload = JSON.stringify(doc)
  let out
  try {
    out = reserialize(payload)
  } catch (error) {
    findings.push(
      `${name}: ingest refused this engine's own output - ${String(error.message).split('\n')[0]}`,
    )
    return
  }
  let round
  try {
    round = JSON.parse(out)
  } catch {
    findings.push(`${name}: ingest re-serialized to something that is not JSON`)
    return
  }
  if (JSON.stringify(round) !== payload) {
    findings.push(`${name}: §6 round trip through the engine's own ingest is not identity`)
  }
}

function report(engine, label, findings) {
  const adjacent = findings.filter((f) => f.includes('§1a')).length
  if (adjacent > 0) adjacentTextRunCounts.push({ label, count: adjacent })

  // THE WAIVER PARTITION, run even on a clean engine: the FIXED direction is
  // only reachable when a finding stops occurring, so an engine with no
  // findings at all is exactly when a stale line most needs deleting. This is
  // the same defect the value panel had one screen up (carve#534).
  //
  // A DERIVED engine is exempt. carve-rb serializes carve-rs's tree, so
  // reconciling it would demand a second set of lines for one engine's debt and
  // fail the run on any host that has the Ruby binding built - while closing the
  // carve-rs issue would then leave the run red until the duplicate lines went
  // too. It is the same reason the shape panel does not give that engine a vote.
  const exempt = notReconciledBecause(engine)
  const {
    waived,
    outstanding,
    undeclared,
    extent,
    reference,
    ungated,
    problems,
    extentProblems,
    ungatedProblems: ungatedLines,
  } = exempt
    ? {
        waived: 0,
        outstanding: 0,
        undeclared: 0,
        extent: 0,
        reference: 0,
        ungated: 0,
        problems: [],
        extentProblems: [],
        ungatedProblems: [],
      }
    : partitionFindings(engine, findings, declaredWaivers, declaredExtents)
  waiverProblems.push(...problems)
  extentDriftProblems.push(...extentProblems)
  ungatedProblems.push(...ungatedLines)
  if (reference > 0) referenceShapeCounts.push({ label, count: reference })

  if (findings.length === 0) {
    console.log(`${label}: conformant\n`)
    return
  }

  // Group, because one missing field repeats across every document - but keep
  // the DOCUMENTS. Keeping one example made carve-php's entire report read as
  // `14x missing pos on "text" [03-links-12.crv]`, "1 distinct", when it was
  // six documents and at least two causes: a §4-permitted merged run in the
  // named document, and four placeable text nodes in a document the line did
  // not mention. The line named the cause nobody should act on and hid the one
  // somebody should (carve#534).
  const ranked = groupFindings(findings)
  const split = exempt
    ? `not reconciled: ${exempt}`
    : waived + outstanding + undeclared + extent + reference + ungated === findings.length
      ? `${waived} waived, ${outstanding} outstanding` +
        (undeclared > 0 ? `, ${undeclared} UNDECLARED` : '') +
        (extent > 0 ? `, ${extent} §4 extent (declared)` : '') +
        (reference > 0 ? `, ${reference} reference-shape (the panel's, not gated here)` : '') +
        (ungated > 0 ? `, ${ungated} UNGATED` : '')
      : 'partition disagrees with the total - this is a bug in partitionFindings'
  console.log(`${label}: ${findings.length} findings, ${ranked.length} distinct (${split})`)
  for (const entry of ranked.slice(0, DISPLAY_LIMIT)) {
    const where = entry.documents.size > 0 ? '  in ' + describeDocuments(entry.documents) : ''
    console.log(`  ${String(entry.n).padStart(4)}x ${entry.key}${where}`)
  }
  // Say so when the display is truncated. This used to end here, so a run with
  // nine distinct findings looked exactly like a run with eight.
  const hidden = ranked.length - DISPLAY_LIMIT
  if (hidden > 0) {
    console.log(`  ... and ${hidden} more distinct finding${hidden === 1 ? '' : 's'} not shown`)
  }
  console.log('')
}

// §3a's coverage, said out loud. Zero is the expected value and the reason to
// print it: a run where this number is not zero has a rule that quietly stopped
// applying to part of the corpus, which reads exactly like a rule that applied
// and found nothing.
if (referenceCoverageGaps > 0) {
  console.log(
    `PART 12 §3a NOT APPLIED to ${referenceCoverageGaps} referencing node(s) - they carry no\n` +
      '  usable position, so the rule about the reference form the author wrote could not run\n' +
      '  on them. The missing position itself is reported above.\n',
  )
}

// A closing statement of what was NOT measured, so the coverage of a run is
// visible at the end rather than inferable from the middle. Without this the
// only signal was one line per engine, several screens up.
console.log(
  `UNKNOWN-PROPERTY PROBE: ${UNKNOWN_PROPERTY_SAMPLE} document(s) per engine. It measures the ` +
    'codec, which answers the same way on every tree - but it is a SAMPLE, and\n' +
    '  a silent one would read as the whole corpus. Raise it with CARVE_UNKNOWN_PROBE_SAMPLE.\n',
)

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

// The panel carve#747 asks for, run after every engine has contributed. Placed
// BEFORE the gates below so it prints even on a run that exits on §1a: a
// disagreement the run cannot attribute is exactly what someone reading a failed
// run needs to see.
const referenceStoodAlone = reportEngineDisagreement()

// NOT A GATE, deliberately. In this fleet a fix lands in one engine first and is
// ported over the following days, so the engine that is RIGHT is routinely the
// odd one out for a while. Failing on that would put this repo red after every
// correct carve-js change, and the fix for a red build would be to wait.
//
// A ratchet against recorded counts was the other option and is worse: it makes
// a rule that is currently violated read as a rule that is currently enforced,
// which is the failure this whole panel exists to undo, one level up.
//
// So: attribute it loudly and let the issue tracker carry it. What IS gated is
// the panel having RUN - see below - because "no engine stood alone" printed
// over two engines is the vacuous pass that started all of this.
if (referenceStoodAlone > 0) {
  console.log(`REFERENCE STOOD ALONE on ${referenceStoodAlone} document(s).`)
  console.log('  Every "tree differs from the reference" line above for those documents')
  console.log('  is attributed to the wrong engine: the other two agreed with each other.\n')
}

// The panel is the only check here that can be vacuous while printing a clean
// line, because it needs three engines to have a majority at all. Under the flag
// CI sets, a panel that did not run is a failure rather than a sentence.
if (process.env.CARVE_REQUIRE_ALL_ENGINES === '1' && !panelRan) {
  console.error('CARVE_REQUIRE_ALL_ENGINES=1 and the three-way comparison did not run.')
  process.exit(1)
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

// THE POSITION DECLARATION, gated after every engine has reported.
//
// Gated rather than reported, unlike the shape and span panels above, because
// this one is not a disagreement between engines that a fix will move through
// over a few days - it is a statement about THIS repo's own record of what is
// permitted and what is owed, and the whole point of splitting the two is that
// the OWED number stops moving on its own. See scripts/spec/ast-waivers.mjs.
//
// Placed AFTER the panels so a run that fails here still prints them: a
// declaration drifting is often the same event as a span moving, and reading
// one without the other is how carve#534's own figures were mis-attributed.
declarationDrift.push({
  file: 'resources/ast-position-waivers.txt',
  what: 'POSITION FINDINGS',
  problems: waiverProblems,
  advice: [
    'Each line there is one engine, one document and one node type, with a count and',
    'either "permitted" (PART 12 §4 exempts a REASSEMBLED node - see the §4 clause on',
    'docs/ast-json-contract.md) or the issue tracking the gap. Update it in the commit that',
    'moves the number, and never widen a line to "permitted" to quiet a run: that page',
    'narrows the exemption to nodes that CANNOT be placed, not nodes nobody has placed.',
  ],
})

/*
 * THE §4 EXTENT DECLARATION, gated beside the position one.
 *
 * Its findings were printed in full by every run and gated by none of them
 * (carve#1637). The counter that held them was named `unwaivable`, which was
 * true of a LINE in the waiver file and false of the run: nothing absorbed
 * them and nothing failed on them either.
 *
 * DECLARED rather than gated at zero, and the difference matters. Thirty
 * violations stand in carve-rs and thirty-eight in carve-php as this lands;
 * gating at zero would put a scheduled job red until nine ports finish across
 * three engines, and a permanently red scheduled job gets muted - which is the
 * failure the whole workflow exists to undo. The ledger ratchets: a count that
 * moves in EITHER direction fails, so a fix must delete its line and a new
 * violation is red the day it lands.
 */
declarationDrift.push({
  file: 'resources/ast-extent-findings.txt',
  what: 'PART 12 §4 EXTENT FINDINGS',
  problems: extentDriftProblems,
  advice: [
    'Each line there is one engine, one §4 extent rule and one node type, with a count',
    'and the issue that will delete it. There is no "permitted" status: a span that is',
    'PRESENT and points at the wrong codepoint has no exempt reading the way a',
    'REASSEMBLED node has. Fix the engine and delete the line, or lower the count in the',
    'commit that lowers the number. UNDECLARED lines above print the line to paste.',
  ],
})

if (referenceShapeCounts.length > 0) {
  const total = referenceShapeCounts.reduce((n, e) => n + e.count, 0)
  console.log(
    `REFERENCE SHAPE DIFFS: ${total} (${referenceShapeCounts
      .map((e) => `${e.label.split(' ')[0]} ${e.count}`)
      .join(', ')}) - reported, not gated here.`,
  )
  console.log('  A tree differing from carve-js is an ENGINE-AGAINST-ENGINE finding, and this')
  console.log('  fleet ports a fix over several days, so the engine that is RIGHT is routinely')
  console.log('  the odd one out. The THREE-WAY SHAPE COMPARISON above owns these, and a')
  console.log('  reference off its pin makes every line here describe that checkout instead.\n')
}

// The findings no ledger covers, and none should. A wrong slice, a span outside
// its parent, a §1a run: each is a defect to fix rather than a number to
// record, so this gate has no declaration file and no way to be silenced.
if (ungatedProblems.length > 0) {
  console.error('')
  console.error('PART 12 findings with no permitted category at all:')
  for (const p of ungatedProblems) console.error(`  ${p}`)
  console.error('')
  console.error('These have no ledger by design. Fix the engine.')
}

const drifted = declarationDrift.filter((d) => d.problems.length > 0)
if (drifted.length > 0) {
  for (const d of drifted) {
    console.error('')
    console.error(`${d.what} does not match ${d.file}:`)
    for (const p of d.problems) console.error(`  ${p}`)
    console.error('')
    for (const line of d.advice) console.error(line)
  }
  process.exit(1)
}

if (ungatedProblems.length > 0) process.exit(1)

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

// The deferred gates, drained after every engine has been measured and every
// roll-up has printed. Restated here rather than only where they were found,
// because a reader looking for the verdict reads the bottom of the run and the
// detail is several screens up by now.
if (deferredGateFailures.length > 0) {
  console.error('')
  for (const line of deferredGateFailures) console.error(line)
  console.error('Reported in full above, gated here so the rest of the run still measured.')
  process.exit(1)
}
