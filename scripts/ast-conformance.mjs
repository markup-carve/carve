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
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

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

const POS_KEYS = ['startLine', 'endLine', 'startColumn', 'endColumn', 'startOffset', 'endOffset']

function* walk(node, path = '$') {
  if (Array.isArray(node)) {
    for (const [i, child] of node.entries()) yield* walk(child, `${path}[${i}]`)
    return
  }
  if (!node || typeof node !== 'object') return
  if (typeof node.type === 'string') yield [node, path]
  for (const [key, value] of Object.entries(node)) {
    if (key === 'pos') continue
    yield* walk(value, `${path}.${key}`)
  }
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

function checkDocument(doc, source, findings) {
  checkShape(doc, findings)
  checkFrontmatterSurvives(doc, source, findings)
  // Offsets are codepoint indices (PART 12 §4), so the source has to be indexed
  // the same way to check them.
  const codepoints = [...source]
  for (const [node, path] of walk(doc)) {
    // An unknown type is the schema's job now (it enumerates them, and the
    // enumeration is checked against docs/profiles.md in
    // tests/ast-schema.test.mjs). Checking it here too reported one defect
    // twice, in two wordings.
    const pos = node.pos
    if (pos === undefined) {
      // The document root is exempt: it spans the whole source by definition
      // (PART 12 section 4).
      if (node.type !== 'document') findings.push(`missing pos on "${node.type}" at ${path}`)
      continue
    }
    for (const key of POS_KEYS) {
      if (!Number.isInteger(pos[key])) {
        findings.push(`pos.${key} is not an integer on "${node.type}" at ${path}`)
      }
    }
    if (Number.isInteger(pos.startOffset) && Number.isInteger(pos.endOffset)) {
      if (pos.endOffset < pos.startOffset) {
        findings.push(`pos.endOffset < startOffset on "${node.type}" at ${path}`)
      }
      if (pos.endOffset > codepoints.length) {
        findings.push(`pos.endOffset past end of source on "${node.type}" at ${path}`)
      }
      // THE UNIT, checked rather than assumed. PART 12 §4 counts codepoints, and
      // codepoints, UTF-16 units and bytes all agree on ASCII - so nothing here
      // distinguished them until this compared a span against the text it
      // claims to cover. A text node is the only node whose exact source text is
      // known from the AST alone.
      // A text node whose source contains a BACKSLASH is skipped: an escape is
      // resolved into the value, so `say\ hello` is four source characters
      // longer than the text it produces and can never equal its own slice. That
      // is the format working, not a wrong span, and asserting on it would
      // produce a false positive nobody would act on.
      // A value carrying the U+E000 INDENT SENTINEL is skipped for the same
      // reason. A line block rewrites each leading space to that private-use
      // character, so the node's value differs from its slice in exactly those
      // positions while spanning the same codepoints. The span is not wrong -
      // it covers precisely the source the node came from - and the engine's
      // internal spelling of an indent is not something this check can compare.
      if (
        node.type === 'text' &&
        typeof node.value === 'string' &&
        !node.value.includes('\ue000') &&
        !codepoints.slice(pos.startOffset, pos.endOffset).includes('\\')
      ) {
        const slice = codepoints.slice(pos.startOffset, pos.endOffset).join('')
        if (slice !== node.value) {
          findings.push(
            `pos does not cover the text it belongs to on "${node.type}" at ${path}: ` +
              `offsets give ${JSON.stringify(slice)}, node says ${JSON.stringify(node.value)}`,
          )
        }
      }
    }
    if (pos.startLine < 1 || pos.startColumn < 1) {
      findings.push(`pos lines/columns are 1-based; got ${pos.startLine}:${pos.startColumn}`)
    }
  }
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
    doc = lib.toAstJson(lib.parse(source))
  } catch (error) {
    jsFindings.push(`${name}: parse threw - ${error.message}`)
    continue
  }
  checkDocument(doc, source, jsFindings)

  // PART 12 §6: serialize then deserialize must equal the parse.
  const round = JSON.parse(JSON.stringify(doc))
  if (JSON.stringify(round) !== JSON.stringify(doc)) {
    jsFindings.push(`${name}: JSON round trip is not identity`)
  }
}
report('carve-js (reference)', jsFindings)

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
    checkDocument(doc, source, rsFindings)
  }
  report(`carve-rs (over ${rsBinary.replace(rsDir + '/', '')}, ${satelliteSamples.length} documents)`, rsFindings)
} else if (existsSync(rsDir)) {
  console.log('carve-rs: checkout found but not built (cargo build --release), not checked\n')
} else {
  console.log('carve-rs: checkout not found, not checked\n')
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
    checkDocument(doc, source, rbFindings)
  }
  report(`carve-rb (over carve-rs, ${satelliteSamples.length} documents)`, rbFindings)
} else {
  console.log('carve-rb: checkout not found, not checked\n')
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
    checkDocument(doc, source, phpFindings)
  }
  report(`carve-php (over bin/carve --json, ${satelliteSamples.length} documents)`, phpFindings)
} else if (existsSync(phpDir)) {
  console.log('carve-php: checkout found but bin/carve is missing, not checked\n')
} else {
  console.log('carve-php: checkout not found, not checked\n')
}

function report(label, findings) {
  if (findings.length === 0) {
    console.log(`${label}: conformant\n`)
    return
  }
  // Group, because one missing field repeats across every document.
  const counts = new Map()
  for (const f of findings) {
    const key = f.replace(/^[^:]+\.crv: /, '').replace(/at \$[^\s]*/, 'at <path>')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  console.log(`${label}: ${findings.length} findings, ${counts.size} distinct`)
  const ranked = [...counts].sort((a, b) => b[1] - a[1])
  for (const [key, n] of ranked.slice(0, DISPLAY_LIMIT)) {
    console.log(`  ${String(n).padStart(4)}x ${key}`)
  }
  // Say so when the display is truncated. This used to end here, so a run with
  // nine distinct findings looked exactly like a run with eight.
  const hidden = ranked.length - DISPLAY_LIMIT
  if (hidden > 0) {
    console.log(`  ... and ${hidden} more distinct finding${hidden === 1 ? '' : 's'} not shown`)
  }
  console.log('')
}
