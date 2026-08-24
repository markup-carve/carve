/*
 * The formatter preserves the document, over the WHOLE corpus.
 *
 * tests/corpus-roundtrip/ pins the canonical writer against eleven hand-written
 * documents, chosen for their escaping decisions and - since carve#787 - for
 * the ORDER the writer emits collected definitions in. That is the right shape for
 * pinning bytes, and it is a thin sample: the corpus has 500+ documents that
 * exercise every construct in the language, and none of them were ever put
 * through the writer.
 *
 * The cost of that gap is not hypothetical. carve-rs turns
 *
 *     > a
 *     >
 *     > %%%
 *     > x
 *     > %%%
 *
 * into source where the commented-out `x` renders as a visible paragraph
 * (carve-rs#432) - and the corpus ALREADY contains documents that expose it
 * (70-blocks-that-render-to-nothing and -3). They pass every gate, because the
 * HTML fixtures compare the FIRST render and nothing re-renders the formatter's
 * output. The documents were there; the property was not checked.
 *
 * Three properties, all from PART 11 §1:
 *
 *   toHtml(fmt(x)) == toHtml(x)   formatting does not change what the document
 *                                 says. This is the one that catches content
 *                                 disclosure - a writer bug that turns hidden
 *                                 text visible fails here and nowhere else.
 *
 *   fmt(fmt(x)) == fmt(x)         formatting settles. A writer that does not
 *                                 is worse than one that loses a field: every
 *                                 run produces a diff.
 *
 *   parse(fmt(x)) == parse(x)     the one §1 states FIRST, and the one the two
 *                                 above are consequences of. §1a says so in as
 *                                 many words: the HTML form is "strictly
 *                                 weaker", so a writer satisfying only it still
 *                                 fails §1. It is asserted here since carve#1679
 *                                 - until then each engine decided on its own
 *                                 both whether to assert it AND how to state
 *                                 PART 11 §1c's carve-out, which is how one rule
 *                                 acquired two spellings.
 *
 * This checks the REFERENCE engine only, because that is what this repo pins.
 * The same properties across the other engines are `compare:impls --roundtrip`,
 * which needs their checkouts and runs in the conformance workflow.
 *
 * DECLARED DRIFT. `resources/engine-pin-drift.txt` names corpus documents the
 * pinned build does not READ the way the corpus says (carve#533's mechanism,
 * consulted by `npm run engine:report -- --check` and by
 * corpus-fmt-cross-read.test.mjs); `resources/engine-fmt-drift.txt` is its
 * writer-side counterpart, for a document the pin reads fine but cannot WRITE
 * back out faithfully (see that file's own header for why the two stay
 * separate). This test previously had no escape valve of its own, so a spec
 * PR that put the corpus ahead of the pin (as carve#665/#666/#668 did for the
 * definition-list `dd` and `+`-attached shapes) failed here even for a slug
 * already declared for the cross-read check. Declared in either file means
 * excused here too, now.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToAstJson, carveToCarve, carveToHtml } from '@markup-carve/carve'
import { parse as parseSpec } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { loadDeclaredFmtDrift, loadWriterOnlyDrift } from './fmt-drift.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

/** The oracle's rendering, or the refusal it raised - both are answers to compare. */
const oracleHtml = (src) => {
  try {
    return renderDoc(parseSpec(src))
  } catch (err) {
    return `REFUSED: ${err.message}`
  }
}

const documents = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()
  .map((f) => ({ slug: f.replace(/\.crv$/, ''), source: readFileSync(resolve(corpusDir, f), 'utf8') }))

const declaredDrift = loadDeclaredFmtDrift(here)

test('the corpus is non-empty, so a broken glob cannot pass as a clean run', () => {
  assert.ok(documents.length > 100, `found ${documents.length} corpus documents`)
})

// BYTE FOR BYTE, which is what the three engines running this same property
// do: carve-js `test/render-carve.test.ts`, carve-php
// `tests/TestCase/CarveFmtCorpusTest.php` and carve-rs `tests/render_carve.rs`
// all compare the two renders untrimmed. This sweep used to trim both sides,
// which made the reference gate the loosest of the four - the wrong way round
// for the one a spec PR runs before the engines see the change.
//
// What a trim cannot see is a writer that adds or drops whitespace at a
// DOCUMENT boundary, and the corpus already holds the document that exposes
// it: `372-an-all-blank-raw-payload-still-emits-its-line` renders HTML that
// STARTS with two newlines, so a writer that ate the blank payload line - the
// exact rule that document exists to pin - changed what the document says and
// this sweep passed.
//
// The predicate is spelled a second time in the staleness ratchet below, and
// the two have to stay identical: strict here and trimmed there means a
// document excused here is reported there as an excuse that no longer applies.
test('formatting never changes what a corpus document says', () => {
  const changed = []
  for (const { slug, source } of documents) {
    const formatted = carveToCarve(source)
    if (carveToHtml(formatted) !== carveToHtml(source)) changed.push(slug)
  }
  const undeclared = changed.filter((slug) => !declaredDrift.has(slug))
  assert.deepEqual(
    undeclared,
    [],
    `these documents render differently after formatting, and resources/engine-pin-drift.txt ` +
      `does not excuse it - the writer changed the document, not just its spelling:\n  ${undeclared.join('\n  ')}`,
  )
})

// The declared-drift excuse applies here for the same reason it applies to the
// sweep above: a writer that changes what a document SAYS has no reason to
// settle on the next pass either, so the two failures are one defect reported
// twice. This sweep was the only one of the three that did not consult the
// files, which nothing noticed while `engine-fmt-drift.txt` was empty.
test('formatting a corpus document settles on the first pass', () => {
  const unsettled = []
  for (const { slug, source } of documents) {
    const once = carveToCarve(source)
    if (carveToCarve(once) !== once) unsettled.push(slug)
  }
  const undeclared = unsettled.filter((slug) => !declaredDrift.has(slug))
  assert.deepEqual(
    undeclared,
    [],
    `formatting these twice differs from formatting once, so every run produces a diff:\n  ` +
      undeclared.join('\n  '),
  )
})

/*
 * parse(fmt(x)) == parse(x) - PART 11 §1's FIRST invariant, bounded by §1c.
 *
 * The two sweeps above are its CONSEQUENCES and §1a says so in as many words:
 * `to_html(fmt(x)) == to_html(x)` is "strictly weaker", so a writer satisfying
 * only it still fails §1. Until carve#1679 this file asserted only the two
 * weaker forms, and the strong one lived inside each engine - which meant every
 * engine decided on its own both WHETHER to assert it and HOW to state the one
 * carve-out §1c makes. Two engines got there first and wrote two different
 * mechanisms. Stating the bound HERE is what stops a third.
 *
 * THE COMPARISON IS THE PUBLISHED AST, not the oracle's block layout, and the
 * difference is not a preference. `scripts/spec/layout.mjs` keeps a paragraph's
 * inline content as its RAW SOURCE LINES and a table's cells as their raw
 * spans, so comparing its trees compares the bytes for everything inline - and
 * §1 explicitly licenses the writer to normalize exactly those bytes
 * ("indentation, marker alignment, escape form"). Measured on this corpus: the
 * layout oracle reports 231 of 1404 documents changed, almost all of them a
 * quote form, a cell's padding or a brace the writer legitimately respelled. §1
 * is stated over the AST - "The first is about the AST, not the bytes" - and
 * `carveToAstJson` is the pinned engine's published AST exit, which PART 12 and
 * resources/ast-schema.json pin the shape of.
 *
 * EQUALITY IS MODULO ESCAPING, which is §1's own clause and not a loosening
 * invented here: §5 requires the writer to escape `"` and `'` unconditionally,
 * so a text node holding a quote MUST come back as `escaped_text` and a literal
 * comparison would call every such document changed. `canonicalAst` below
 * implements that clause, and it is load-bearing rather than decorative -
 * without the coalescing half, 71 of 1404 documents differ; with it, 4 do.
 *
 * KEY ORDER IS IGNORED for the same reason §4's own procedure ignores it (W3:
 * "compare the resulting documents, ignoring source positions and key order").
 * A JSON object is unordered, `attrs.order` is where an authored sequence is
 * recorded, and five of the 1404 documents differ by nothing but the order the
 * two parses happened to insert `attrs`' own keys in.
 */

// The two node kinds PART 11 §1c is stated over. STATED OVER WHAT THE SHAPE
// SPELLS, never over a vocabulary: an `image` is INLINE and a `comment` is
// BLOCK (docs/profiles.md), so the clause names them one at a time precisely
// because no type test reaches both.
const SPELLS_ITS_OWN_WRAPPER_AWAY = new Set(['image', 'comment'])

/**
 * A document's published tree, canonical enough for §1's equality to be asked.
 *
 * Source positions go, because §1 is about the AST and not the bytes. Escaping
 * goes, because §1 says it must: `escaped_text` becomes `text` and adjacent
 * text runs coalesce, so `a\-b` and `a-b` are the same document. Object keys
 * are sorted, because §4 W3 compares "ignoring source positions and key order".
 *
 * `attrs` IS DESCENDED INTO here, unlike in the engines' own versions, and the
 * reason the two differ is the reason it is safe: those versions skip `attrs`
 * to avoid RENAMING an author-controlled key that happens to be spelled `type`
 * or `pos`, and this one deletes nothing and renames nothing outside a node
 * whose own `type` says `escaped_text`. Sorting a map's keys cannot change the
 * map, and an attribute's authored ORDER is carried by `attrs.order`, which is
 * an array and stays put.
 */
const canonicalAst = (value) => {
  if (Array.isArray(value)) {
    const out = []
    for (const item of value) {
      const child = canonicalAst(item)
      const isPlainText = (node) =>
        node !== null &&
        typeof node === 'object' &&
        !Array.isArray(node) &&
        node.type === 'text' &&
        typeof node.value === 'string' &&
        Object.keys(node).length === 2
      const last = out.length > 0 ? out[out.length - 1] : null
      if (last !== null && isPlainText(last) && isPlainText(child)) {
        last.value += child.value
        continue
      }
      out.push(child)
    }
    return out
  }
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      if (key === 'pos' || key === 'srcByteLength') continue
      out[key] = canonicalAst(value[key])
    }
    if (out.type === 'escaped_text') out.type = 'text'
    return out
  }
  return value
}

/**
 * True where a node is the wrapper PART 11 §1c permits losing, and nothing else.
 *
 * THE BOUND, and it is the whole of what carve#1679 made canonical: only the
 * dissolution of a BARE single-child wrapper is forgiven. Bare means `type` and
 * `children` and no third key - the node carries no attributes, no label and no
 * value that dissolving it would take with it, which is exactly what §1c
 * promises survives ("the content, its attributes and its neighbours all
 * survive as themselves"). A paragraph carrying an attribute block is not bare,
 * and a writer that dropped it still fails.
 *
 * The wrapper is a `paragraph` and its single child is a node whose own
 * spelling at the block's column reads back as a block opener of that node's
 * kind. Both halves are load-bearing, and each is pinned below by the assertion
 * that goes red when it is dropped. Drop the first and a quote holding one
 * image dissolves exactly as the paragraph does, so `> ![a](u)` and ` ![a](u)`
 * compare equal and a CHANGED NODE TYPE stops failing. Drop the second and
 * EVERY single-child paragraph dissolves, so a writer that lost the paragraph
 * around a text run or a link is forgiven a loss §1c never licensed.
 */
const isBareWrapper = (node) => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return false
  const keys = Object.keys(node)
  if (keys.length !== 2 || !keys.includes('type') || !keys.includes('children')) return false
  if (node.type !== 'paragraph') return false
  if (!Array.isArray(node.children) || node.children.length !== 1) return false
  const only = node.children[0]
  return (
    only !== null &&
    typeof only === 'object' &&
    !Array.isArray(only) &&
    SPELLS_ITS_OWN_WRAPPER_AWAY.has(only.type)
  )
}

/**
 * The tree with every wrapper §1c may dissolve dissolved into its child.
 *
 * EVERY LIST-VALUED SLOT is walked, not just `children`: a list reaches its
 * entries through `items`, a table through `rows` and `cells`, and a ceiling
 * reached inside a list item is still a ceiling (corpus 411-5 is exactly that
 * shape). Keyed on the SHAPE of the value rather than on a list of key names,
 * so a new child-bearing slot is covered the day it appears. `attrs` is an
 * object rather than a list and is therefore never walked, which is also what
 * keeps this out of author-controlled data.
 *
 * Never applied to the node it is handed, which has no parent to dissolve into.
 */
const withoutBareWrappers = (node) => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return node
  const out = {}
  for (const [key, value] of Object.entries(node)) {
    if (!Array.isArray(value)) {
      out[key] = value
      continue
    }
    out[key] = value.map((child) => {
      if (child === null || typeof child !== 'object' || Array.isArray(child)) return child
      const walked = withoutBareWrappers(child)
      return isBareWrapper(walked) ? walked.children[0] : walked
    })
  }
  return out
}

// MEMOIZED because four sweeps in this file ask for the same three answers over
// the same 1404 documents, and a parse is the expensive part of every one of
// them. Keyed on the source text, so a memo can only ever return what a fresh
// call would have.
const memo = (compute) => {
  const seen = new Map()
  return (source) => {
    if (!seen.has(source)) seen.set(source, compute(source))
    return seen.get(source)
  }
}

/** fmt(x), computed once per distinct source. */
const written = memo(carveToCarve)

/** The canonical published tree of a document, as one comparable string. */
const astTree = memo((source) => JSON.stringify(canonicalAst(carveToAstJson(source))))

/** The same tree with the wrappers §1c may dissolve taken out of both sides. */
const astShape = memo((source) => JSON.stringify(withoutBareWrappers(canonicalAst(carveToAstJson(source)))))

test('formatting a corpus document re-parses to the same tree (PART 11 §1, bounded by §1c)', () => {
  const beyond = []
  for (const { slug, source } of documents) {
    if (declaredDrift.has(slug)) continue
    const formatted = written(source)
    if (astTree(formatted) === astTree(source)) continue
    // THE DIFFERENCE MUST BE A §1c WRAPPER LOSS AND NOTHING ELSE. Without this
    // bound the carve-out would key on "the tree came back different", which
    // forgives a dropped node as readily as a lost wrapper. There is no
    // allowlist here and there is not to be one: a slug would silence a whole
    // document, where this states the one difference §1c licenses and leaves
    // every other difference failing.
    if (astShape(formatted) !== astShape(source)) beyond.push(slug)
  }
  assert.deepEqual(
    beyond,
    [],
    `fmt(x) does not re-parse to parse(x) for these documents, and the difference is more than the ` +
      `PART 11 §1c wrapper loss that clause forgives:\n  ${beyond.join('\n  ')}`,
  )
})

// THE CARVE-OUT IS REACHED, so it cannot rot unnoticed. The sweep above takes
// the §1c branch silently: if the corpus or the pin changed so that no document
// re-parsed differently at all, the branch would stop executing, the bound
// would stop being exercised and nothing would say so. Asked once, over the
// corpus, because it is a question about the corpus - and it fails in the
// direction a per-document assertion cannot: the day a lone indented image
// round-trips cleanly, this goes red and the branch and this test are deleted
// together. The message names the documents, so a renumbering reads as the
// rename it is.
test('a corpus document still reaches the PART 11 §1c ceiling', () => {
  const reached = documents
    .filter(({ slug }) => !declaredDrift.has(slug))
    .filter(({ source }) => astTree(written(source)) !== astTree(source))
    .map(({ slug }) => slug)
  assert.notDeepEqual(
    reached,
    [],
    'no corpus document re-parses differently after formatting: the PART 11 §1c bound in the sweep ' +
      'above is dead and should be deleted along with this test',
  )
})

// THE BOUND'S WIDTH IS PINNED HERE OR NOWHERE, and that is not a stylistic
// choice. `withoutBareWrappers` is applied to BOTH trees, so WIDENING it can
// only ever hide a difference and never create one: whatever extra shape it
// swallows, it swallows identically on each side and the two still agree. The
// sweep above therefore stays green under any widening whatsoever.
//
// MEASURED, not assumed (carve#1679), on the pinned build over all 1404 corpus
// documents and their 10986 canonical nodes. Each row widens `isBareWrapper`
// one way; every row leaves the sweep above passing, and the second column is
// what separates a real loosening from a no-op:
//
//   widened to dissolve                   nodes decided differently   documents failing
//   any single-child paragraph                                 1166                   0
//   any bare single-child node                                   25                   0
//   a paragraph carrying attributes                               0                   0
//
// The third row is why the second column is reported. It is a genuine
// loosening, it is the one carve-php's own bound test was written against, and
// against THIS predicate on THIS corpus it decides nothing - so a green sweep
// under it would have been evidence in neither direction. The near misses have
// to be asserted directly, which is what this test does. Each `false` below is
// a shape §1c does not reach: "a block whose content spells anything ELSE -- a
// second node beside it, a text run, a NO-BREAK SPACE (§7) -- keeps its wrapper
// and no ceiling is reached."
test('the PART 11 §1c bound reaches a bare single-child wrapper and no other shape', () => {
  const image = { type: 'image', src: 'a.jpg', alt: 'Apollo' }
  // ASKED AS "DID THE WRAPPER SURVIVE", not as "did the IMAGE come out", and
  // the difference is a check that can fail versus one that cannot. Comparing
  // the result against the image makes every negative assertion below pass by
  // construction for a candidate whose child is NOT the image - so a predicate
  // widened to dissolve any single-child paragraph would leave this whole test
  // green. Compared by VALUE, because `withoutBareWrappers` rebuilds every node
  // it walks and never returns the same object it was given.
  const dissolves = (candidate) => {
    const kept = withoutBareWrappers(candidate)
    const only = withoutBareWrappers({ type: 'document', children: [candidate] }).children[0]
    return JSON.stringify(only) !== JSON.stringify(kept)
  }

  assert.ok(
    dissolves({ type: 'paragraph', children: [image] }),
    'a bare single-child wrapper is the one loss PART 11 §1c permits',
  )
  assert.ok(
    withoutBareWrappers({
      type: 'document',
      children: [{ type: 'paragraph', children: [{ type: 'comment', value: 'c' }] }],
    }).children[0].type === 'comment',
    'the second shape §1c names is a paragraph holding one comment',
  )

  // ATTRIBUTES ARE CONTENT. Dissolving this wrapper would take them with it,
  // which is the opposite of "its attributes survive as themselves".
  assert.ok(
    !dissolves({ type: 'paragraph', attrs: { classes: ['k'] }, children: [image] }),
    'a wrapper carrying attributes is not bare: dissolving it would drop them',
  )
  // A KEY OF ITS OWN, of any kind. carve-php measured its own widened predicate
  // swallowing exactly these - a heading with `attrs`, a link with an `href`, a
  // footnote with a `label` - on 1107 nodes across the same 1404 documents. The
  // predicate here is narrower, so the same widening decides nothing on this
  // corpus, which is precisely why each shape is asserted rather than swept.
  for (const [kind, node] of Object.entries({
    footnote: { type: 'footnote', label: '1', children: [image] },
    link: { type: 'link', href: 'u', children: [image] },
    heading: { type: 'heading', level: 1, children: [image] },
    admonition: { type: 'admonition', kind: 'note', children: [image] },
    table_cell: { type: 'table_cell', header: true, children: [image] },
  })) {
    assert.ok(!dissolves(node), `a ${kind} owns a key beyond its child, so it is not a wrapper §1c may dissolve`)
  }
  // NOT A PARAGRAPH. `> ![a](u)` reads back as the quote, so the quote keeps its
  // wrapper - and this is the half that keeps a CHANGED NODE TYPE failing.
  assert.ok(!dissolves({ type: 'block_quote', children: [image] }), 'a quote holding one image keeps its wrapper')
  // A CONTENT NODE THAT SPELLS NOTHING. §1c reaches a block whose content, at
  // that block's own column, reads back as a block opener of its own kind; a
  // text run reads back as the paragraph. Without this half EVERY single-child
  // paragraph dissolves, and a writer that lost the paragraph around a text run
  // or a link would be forgiven a loss the clause never licensed.
  assert.ok(
    !dissolves({ type: 'paragraph', children: [{ type: 'text', value: 'x' }] }),
    'a paragraph holding a text run keeps its wrapper',
  )
  // A SECOND NODE BESIDE IT, which is not a block whose WHOLE content is one node.
  assert.ok(
    !dissolves({ type: 'paragraph', children: [image, { type: 'text', value: 'x' }] }),
    'a wrapper holding a neighbour beside its child is not a lone-content block',
  )
  // NO CHILDREN AT ALL, which has nothing to dissolve into.
  assert.ok(!dissolves({ type: 'paragraph', children: [] }), 'an empty block dissolves into nothing')

  // THE ROOT IS NEVER DISSOLVED - it has no parent to dissolve into.
  const root = { type: 'document', children: [image] }
  assert.deepEqual(withoutBareWrappers(root), root, 'the root keeps its wrapper')
})

// THE PROPERTY IS LIVE, proven on the four differences carve#1679 names as the
// ones the bound must NOT forgive. Each arm is a writer output that differs from
// its input by exactly one of them, and each must survive the dissolution and
// still compare unequal - otherwise the sweep above would be a check that
// cannot fail, which carve#755 catalogs eleven of.
test('the strong property still fails on every difference PART 11 §1c does not forgive', () => {
  const arms = [
    ['a dropped node', 'a\n\n![x](u)\n', 'a\n'],
    ['a reordering', 'a\n\nb\n', 'b\n\na\n'],
    ['a changed attribute', '{.c}\n# H\n', '{.d}\n# H\n'],
    ['a changed node type', 'x\n', '> x\n'],
  ]
  for (const [what, source, output] of arms) {
    assert.notEqual(astShape(source), astShape(output), `${what} survived the PART 11 §1c bound`)
  }
  // THE CONTROL, without which every arm above would pass a comparison that
  // simply never forgives anything. The ceiling itself IS forgiven: the two
  // spellings of a lone image differ as trees and agree as shapes.
  assert.notEqual(astTree(' ![Apollo](a.jpg)\n'), astTree('![Apollo](a.jpg)\n'))
  assert.equal(astShape(' ![Apollo](a.jpg)\n'), astShape('![Apollo](a.jpg)\n'))
})

// THE RATCHET ON THE EXCUSE ITSELF. Every other declared-drift file in this
// repo is checked in both directions; this one was checked in neither, because
// a slug in it can only ever turn a failure into a pass. So a line that the
// next pin bump makes untrue would keep excusing a document that no longer
// needs excusing, and the first person to notice would be whoever eventually
// removed it by hand.
test('every writer-drift line still names a document the pin writes wrongly', () => {
  const declared = loadWriterOnlyDrift(here)
  const byslug = new Map(documents.map((d) => [d.slug, d.source]))
  const stale = []
  for (const slug of declared) {
    const source = byslug.get(slug)
    // A slug naming no corpus document is stale in the strongest sense: the
    // fixture was renamed or removed and the line outlived it.
    if (source === undefined) {
      stale.push(`${slug} (no such corpus document)`)
      continue
    }
    const once = carveToCarve(source)
    // Untrimmed, and the same predicate as the sweep above by construction.
    const changesMeaning = carveToHtml(once) !== carveToHtml(source)
    const unsettled = carveToCarve(once) !== once
    // "CANNOT READ IT BACK THE SAME WAY" HAS TWO READERS, and the pin is only
    // one of them. corpus-fmt-cross-read.test.mjs consults this same file to
    // excuse the ORACLE reading a different document out of the pin's output,
    // so a line excusing exactly that was reported stale here while it was the
    // only thing keeping the other gate green (carve#1450). The reader that
    // matters for a corpus document is the one the corpus states, which is the
    // oracle; the pin's own reading is the second, not the only, way to be
    // wrong.
    const oracleChanges = oracleHtml(once) !== oracleHtml(source)
    // A THIRD WAY TO BE WRONG IS TO WRITE THE WRONG BYTES, and it was missing
    // here while the `.fmt` sweep below already consulted this file. Those two
    // halves contradicted each other: a spec PR that pins a canonical form the
    // pin does not emit declares the slug, the sweep honors the declaration -
    // and this ratchet then calls the line stale, because a document whose two
    // spellings render the same HTML and re-parse to the same tree round-trips
    // clean by all three signals above. The escape valve the comment below
    // describes could not actually be used (carve#1507).
    const fixture = resolve(corpusDir, `${slug}.fmt`)
    const fmtBytesDiffer = existsSync(fixture) && once !== readFileSync(fixture, 'utf8')
    // A FOURTH WAY, for the same reason as the third: the sweep for
    // `parse(fmt(x)) == parse(x)` consults this file too since carve#1679, so a
    // line declared for a document the pin re-parses wrongly - and only for
    // that - would be called stale here while it was the only thing keeping
    // that sweep green. A PART 11 §1c wrapper loss is NOT drift, it is what the
    // clause forgives, so the SHAPE and not the tree is what is asked.
    const reparseDiffers = astShape(once) !== astShape(source)
    if (!changesMeaning && !unsettled && !oracleChanges && !fmtBytesDiffer && !reparseDiffers) {
      stale.push(`${slug} (round-trips clean)`)
    }
  }
  assert.deepEqual(
    stale,
    [],
    'resources/engine-fmt-drift.txt declares drift that no longer happens - ' +
      `delete the line in the commit that moves the pin past it:\n  ${stale.join('\n  ')}`,
  )
})

/*
 * The two sweeps above assert PROPERTIES, and every canonical-writer divergence
 * found so far satisfies both of them: a comment renders nothing, so a body at
 * the wrong column keeps `to_html(fmt(x)) == to_html(x)`, and a writer is
 * happily idempotent about a spelling it picked itself. The bytes are the only
 * thing that separates one canonical form from two.
 *
 * `.fmt` files existed for that and were read by nothing (carve#671). This
 * reads them for the pinned carve-js build; the engines need the same check
 * against their own writers, which is the other half of that issue.
 *
 * That other half is now `scripts/fmt-fixture-claims.mjs` (carve#841), which
 * runs the same fixtures against carve-js, carve-rs and carve-php and gates in
 * the conformance workflow, where the sibling checkouts are provisioned. Both
 * are wanted: this one runs on every PR against the build this repo pins, that
 * one cannot run per-PR and is the only thing that can see a writer defect
 * sparing carve-js. A new fixture belongs to both, and adding it here is enough
 * - that checker globs the same directory.
 */
const pinned = documents
  .map(({ slug, source }) => {
    const path = resolve(corpusDir, `${slug}.fmt`)
    return existsSync(path) ? { slug, source, expected: readFileSync(path, 'utf8') } : null
  })
  .filter(Boolean)

test('a .fmt fixture is read, so it can fail', () => {
  // Guards the sweep below against a glob that quietly matches nothing - the
  // failure mode the fixtures were already in.
  assert.ok(pinned.length >= 5, `found ${pinned.length} .fmt fixtures`)
})

// THE DECLARED-DRIFT EXCUSE REACHES HERE TOO, and this sweep was the last of
// the four in this file that did not consult it. The gap made the `.fmt`
// fixtures unusable for the one job they are best at: naming the canonical form
// BEFORE the engines reach it. A spec PR that rules on the writer could pin the
// bytes only by leaving the suite red, so it did not pin them at all, and three
// engines went on emitting three different strings with nothing saying which was
// right (carve#1334, where they emitted `a \`, `a ` and `a` for one document).
//
// A slug here is excused for the SAME reason as above and under the SAME
// ratchet: the staleness check below already fails the moment the pin stops
// drifting on it, so an excuse cannot outlive its cause.
test('fmt(x) matches every .fmt fixture (PART 11 §2)', () => {
  const wrong = []
  for (const { slug, source, expected } of pinned) {
    if (declaredDrift.has(slug)) continue
    const actual = carveToCarve(source)
    if (actual !== expected) wrong.push(`${slug}\n    expected: ${JSON.stringify(expected)}\n      actual: ${JSON.stringify(actual)}`)
  }
  assert.deepEqual(wrong, [], `the writer disagrees with its pinned canonical form:\n  ${wrong.join('\n  ')}`)
})

// A .fmt fixture the pin cannot produce still has to be a FAITHFUL
// serialization, or the drift line above pins a corruption as the target. The
// oracle is what checks it, because the engine is by definition the thing that
// cannot write these bytes yet: it re-reads the fixture and the case input and
// requires the same rendering out of both.
test('every drifting .fmt fixture still says what its case input says', () => {
  const wrong = []
  for (const { slug, source, expected } of pinned) {
    if (!declaredDrift.has(slug)) continue
    // Untrimmed too: a fixture that drops a boundary blank line is exactly the
    // unfaithful serialization this check exists to catch.
    if (renderDoc(parseSpec(expected)) !== renderDoc(parseSpec(source))) wrong.push(slug)
  }
  assert.deepEqual(
    wrong,
    [],
    `these .fmt fixtures are not faithful serializations of their case input:\n  ${wrong.join('\n  ')}`,
  )
})
