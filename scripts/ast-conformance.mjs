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
 * The reference is carve-js: its AST is plain data and PART 12 pins its shape.
 * Other engines are compared structurally against it.
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
 *   ../carve-js   (reference, required)
 *   ../carve-rb   (serializes carve-rs's tree through the Ruby binding)
 *   carve-php  (serializes through `bin/carve --json`)
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

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
const DISPLAY_LIMIT = 8

const POS_KEYS = ['startLine', 'endLine', 'startColumn', 'endColumn', 'startOffset', 'endOffset']

/** The node-type vocabulary, read from the spec rather than restated here. */
function vocabulary() {
  const profiles = readFileSync(resolve(root, 'docs/profiles.md'), 'utf8')
  const types = new Set()
  for (const label of ['Block', 'Inline']) {
    const section = profiles.match(new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)\\n\\n`))
    if (!section) continue
    for (const m of section[1].matchAll(/`([a-z_]+)`/g)) types.add(m[1])
  }
  // Types the vocabulary paragraphs do not list because they are not
  // profile-deniable. profiles.md answers "what can a profile deny", which is a
  // SMALLER set than "what appears in the AST" - so PART 12 §2's "the node-type
  // identifier from profiles.md" reads tighter than the tree actually is.
  //
  //   document            the root, which no profile denies
  //   smart_punctuation   PART 9 §8 folds it into the `text` trust class
  //   literal_inline      likewise
  //   tag                 profiles.md classifies `#tag` as `mention` on purpose,
  //                       since `@user` and `#tag` are one trust class - but the
  //                       AST keeps them distinct and every engine emits `tag`
  //   abbreviation_def    the definition line renders nothing, so denying it
  //                       would mean nothing; the inline `abbreviation` it feeds
  //                       is what a profile controls
  types.add('document')
  types.add('smart_punctuation')
  types.add('literal_inline')
  types.add('tag')
  types.add('abbreviation_def')
  return types
}

const KNOWN_TYPES = vocabulary()

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

function checkDocument(doc, source, findings) {
  // Offsets are codepoint indices (PART 12 §4), so the source has to be indexed
  // the same way to check them.
  const codepoints = [...source]
  for (const [node, path] of walk(doc)) {
    if (!KNOWN_TYPES.has(node.type)) {
      findings.push(`unknown node type "${node.type}" at ${path}`)
    }
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
      if (
        node.type === 'text' &&
        typeof node.value === 'string' &&
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

/** Field names per node type, so another engine can be compared against them. */
function shapeOf(doc) {
  const shape = new Map()
  for (const [node] of walk(doc)) {
    const keys = Object.keys(node).filter((k) => k !== 'pos').sort().join(',')
    if (!shape.has(node.type)) shape.set(node.type, new Set())
    shape.get(node.type).add(keys)
  }
  return shape
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

const jsFindings = []
const referenceShape = new Map()
for (const { name, source } of samples) {
  let doc
  try {
    doc = lib.parse(source)
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

  for (const [type, keysets] of shapeOf(doc)) {
    if (!referenceShape.has(type)) referenceShape.set(type, new Set())
    for (const k of keysets) referenceShape.get(type).add(k)
  }
}
report('carve-js (reference)', jsFindings)

// ---- carve-rb: serializes carve-rs's tree ----------------------------------
if (existsSync(resolve(rbDir, 'lib/carve'))) {
  const rbFindings = []
  for (const { name, source } of satelliteSamples) {
    let doc
    try {
      const out = execFileSync(
        'ruby',
        ['-Ilib', '-e', 'require "carve"; require "json"; puts JSON.generate(Carve.parse(STDIN.read))'],
        { cwd: rbDir, input: source, encoding: 'utf8', env: { ...process.env } },
      )
      doc = JSON.parse(out)
    } catch (error) {
      rbFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(doc, source, rbFindings)
    for (const [type, keysets] of shapeOf(doc)) {
      const reference = referenceShape.get(type)
      if (!reference) continue
      for (const keys of keysets) {
        if (!reference.has(keys)) {
          rbFindings.push(`${name}: "${type}" fields [${keys}] not in the reference shape`)
        }
      }
    }
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
      })
      doc = JSON.parse(out)
    } catch (error) {
      phpFindings.push(`${name}: could not serialize - ${String(error.message).split('\n')[0]}`)
      continue
    }
    checkDocument(doc, source, phpFindings)
    for (const [type, keysets] of shapeOf(doc)) {
      const reference = referenceShape.get(type)
      if (!reference) continue
      for (const keys of keysets) {
        if (!reference.has(keys)) {
          phpFindings.push(`${name}: "${type}" fields [${keys}] not in the reference shape`)
        }
      }
    }
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
