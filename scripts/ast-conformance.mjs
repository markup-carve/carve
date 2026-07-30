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
 *   node scripts/ast-conformance.mjs [--limit=40]
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
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : 40

const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')
const rbDir = process.env.CARVE_RB_DIR ?? resolve(root, '../carve-rb')
const phpDir = process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php')

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
  // profile-deniable: the document root, and smart punctuation, which PART 9 §8
  // folds into the `text` trust class.
  types.add('document')
  types.add('smart_punctuation')
  types.add('literal_inline')
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
      if (pos.endOffset > source.length) {
        findings.push(`pos.endOffset past end of source on "${node.type}" at ${path}`)
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
const samples = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()
  .slice(0, limit)
  .map((f) => ({ name: f, source: readFileSync(resolve(corpusDir, f), 'utf8') }))

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
  checkDocument(doc, source, jsFindings.length < 40 ? jsFindings : [])

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
  for (const { name, source } of samples.slice(0, 12)) {
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
    if (rbFindings.length < 20) checkDocument(doc, source, rbFindings)
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
  report('carve-rb (over carve-rs)', rbFindings)
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
  for (const { name, source } of samples.slice(0, 12)) {
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
    if (phpFindings.length < 20) checkDocument(doc, source, phpFindings)
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
  report('carve-php (over bin/carve --json)', phpFindings)
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
  for (const [key, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${String(n).padStart(4)}x ${key}`)
  }
  console.log('')
}
