/*
 * docs/ast-json.md quotes MEASURED engine state, and measured state rots.
 *
 * That page carries a per-engine table of what each implementation publishes.
 * Twice in two days it was found wrong, in opposite directions: the positions
 * column named a definition-list gap carve-rs had already fixed (carve#673),
 * and the §3a rows said no engine publishes `rawRef` when all three had started
 * to (carve#674). A third row described an `abbreviation_def` sitting inside a
 * container - a node no engine produces, because the spec answered that
 * question by making the line ordinary text there.
 *
 * Nothing re-measured any of it. `divergence-claims.test.mjs` does this job for
 * docs/divergence-from-djot.md and `implementation-comparison-counts.test.mjs`
 * for the counts on the comparison page; this file is the same idea for the
 * claims on ast-json.md that the REFERENCE ENGINE can answer.
 *
 * It deliberately does two things at once: it measures the engine, and it reads
 * the page. A test that only measured would go green while the prose said the
 * opposite; a test that only read the prose would pin a sentence nobody had
 * checked. Both together mean the row and the engine cannot drift apart
 * quietly - which is the only failure mode this page has ever had.
 *
 * The carve-rs and carve-php rows are out of scope here: this suite has one
 * engine, the `@markup-carve/carve` pin. Those rows are measured by
 * `scripts/ast-conformance.mjs`, which runs the satellites nightly.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  carveToAnsi,
  carveToHtml,
  carveToMarkdown,
  carveToPlainText,
  fromAstJson,
  parse,
  renderHtml,
  toAstJson,
} from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/ast-json.md'), 'utf8')

const jsRow = page.split('\n').find((line) => line.startsWith('| carve-js |'))

const nodesOfType = (doc, type) => {
  const found = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (node.type === type) found.push(node)
    for (const value of Object.values(node)) if (value && typeof value === 'object') walk(value)
  }
  walk(doc)
  return found
}

const treeOf = (source) => toAstJson(parse(source))

test('the page has a carve-js row to check', () => {
  assert.ok(jsRow, 'no `| carve-js |` row in docs/ast-json.md; the table shape changed')
})

/*
 * §3a, the claim that was wrong in both directions.
 */
test('a resolved reference publishes href, ref and rawRef - and the row says so', () => {
  const [link] = nodesOfType(treeOf('See [getting started][] here.\n\n[getting started]: /start\n'), 'link')
  assert.ok(link, 'no link node for a collapsed reference')
  assert.equal(link.href, '/start')
  assert.equal(link.ref, 'getting started')
  assert.equal(link.rawRef, '[getting started][]')
  assert.match(
    jsRow,
    /§3a conformant on the resolved form/,
    'the engine publishes the whole §3a triple; the carve-js row no longer says so',
  )
})

test('an unresolved reference is a link node, not flattened text', () => {
  const tree = treeOf('See [missing][] here.\n')
  const [link] = nodesOfType(tree, 'link')
  assert.ok(link, 'an unresolved reference was flattened; §3a keeps it a link node')
  assert.equal(link.ref, 'missing')
  assert.equal(link.rawRef, '[missing][]')
})

/*
 * §7 and PART 9: an abbreviation definition is recognized ONLY at document
 * level. The rows used to say carve-js leaves an `abbreviation_def` inside its
 * container, which is not a thing any engine emits - there is no node to place
 * either way.
 */
for (const [container, source] of [
  ['a block quote', '> *[HTML]: Hyper Text\n>\n> The HTML spec.\n'],
  ['a list item', '- *[HTML]: Hyper Text\n\n  The HTML spec.\n'],
  ['a div', ':::\n*[HTML]: Hyper Text\n\nThe HTML spec.\n:::\n'],
]) {
  test(`no abbreviation_def is emitted inside ${container}`, () => {
    assert.deepEqual(nodesOfType(treeOf(source), 'abbreviation_def'), [])
  })
}

test('an abbreviation_def IS emitted at document level, carrying abbr and expansion', () => {
  const tree = treeOf('*[HTML]: Hyper Text\n\nThe HTML spec.\n')
  const [def] = nodesOfType(tree, 'abbreviation_def')
  assert.ok(def, 'no abbreviation_def at document level')
  assert.equal(def.abbr, 'HTML')
  assert.equal(def.expansion, 'Hyper Text')
  // It is a CHILD OF THE DOCUMENT, which is the half §7 states.
  assert.ok(
    tree.children.some((child) => child.type === 'abbreviation_def'),
    'the definition is not a direct child of the document',
  )
})

/*
 * The rows must not re-acquire the claim that was removed. A negative assertion
 * on prose is usually a smell, but this exact sentence was in the table for
 * weeks describing a node that is not produced, and the measurement above is
 * what makes it false.
 */
test('no row claims an abbreviation_def sits inside its container', () => {
  // ROWS ONLY. The prose below the table explains that this claim was removed
  // and why, so scanning the whole page matches the explanation and fails on
  // the sentence that documents the fix - which is how a negative assertion
  // usually earns its bad reputation.
  const rows = page.split('\n').filter((line) => line.startsWith('| carve-'))
  for (const row of rows) {
    assert.doesNotMatch(
      row,
      /abbreviation_def` (inside|in) its container/,
      'a row claims an abbreviation_def is left in a container; no engine emits one there',
    )
  }
})

/*
 * PART 12 section 3a: A DESTINATION IS THE AUTHOR'S TEXT, UNSANITIZED, and the
 * corollary that a consumer rendering one owns the denylist.
 *
 * The page grew that paragraph in carve#764 and nothing measured it. It is the
 * kind of claim that has to be measured from BOTH sides, because the two
 * failure directions are opposite and both are plausible fixes someone might
 * make:
 *
 *   - an engine that starts sanitizing the tree makes it lossy and breaks the
 *     section 6 round trip, while looking like a security improvement;
 *   - a target that stops blanking makes the denylist a suggestion.
 *
 * So this pins the tree keeping the scheme, every target dropping it, and the
 * re-ingest applying it - the three sentences the paragraph actually makes.
 */
const DANGEROUS = 'javascript:alert(1)'

test('the serialized tree keeps a denylisted scheme verbatim', () => {
  const [link] = nodesOfType(treeOf('[click](' + DANGEROUS + ')\n'), 'link')
  assert.ok(link, 'no link node')
  assert.equal(
    link.href,
    DANGEROUS,
    'the tree sanitized a destination. Section 3a records what the author wrote, so ' +
      'blanking it here makes the tree lossy and breaks the section 6 round trip - the ' +
      'denylist belongs to the target, not to the serializer.',
  )
})

test('the markup targets blank it, which is why the tree may keep it', () => {
  const source = '[click](' + DANGEROUS + ')\n'
  for (const [name, render] of [
    ['html', carveToHtml],
    ['markdown', carveToMarkdown],
    ['plain', carveToPlainText],
  ]) {
    const out = render(source)
    assert.ok(
      !out.includes('javascript:'),
      name + ' emitted the denylisted scheme. PART 9 section 25 binds every target that ' +
        'emits a resolvable URL, not the HTML renderer alone.',
    )
  }
})

test('the ansi target does NOT blank it, and that is an open question', () => {
  // Measured, not asserted as correct: all three engines print the destination
  // as dim text after the label, byte for byte, while all three blank it in
  // Markdown. Whether section 25 binds a destination a terminal auto-links is
  // carve#765; this test pins the CURRENT answer so that whichever way it is
  // settled, the change is deliberate and shows up here.
  const out = carveToAnsi('[click](' + DANGEROUS + ')\n')
  assert.ok(
    out.includes(DANGEROUS),
    'the ansi target stopped printing the destination. If that was deliberate, ' +
      'carve#765 was answered - update this test and the docs paragraph together.',
  )
})

test('feeding the tree back through the engine applies the denylist', () => {
  // The page tells a consumer this is the escape hatch: hand the tree back to a
  // conforming engine and it is a target, so it blanks. If that stopped being
  // true the advice would be actively harmful.
  const tree = treeOf('[click](' + DANGEROUS + ')\n')
  const html = renderHtml(fromAstJson(JSON.parse(JSON.stringify(tree))))
  assert.ok(!html.includes('javascript:'), 're-ingesting the tree did not blank the scheme')
})

test('the page still tells a consumer both halves', () => {
  // Measured state and prose in one test, the same reason the rest of this file
  // does it: a green suite over a page that says the opposite is the only
  // failure mode this page has had.
  assert.match(
    page,
    /consumer that renders a destination owns the denylist/i,
    'docs/ast-json.md no longer tells a consumer it owns the denylist',
  )
  assert.match(
    page,
    /javascript:alert\(1\)/,
    'docs/ast-json.md no longer shows what an unsanitized destination looks like',
  )
})
