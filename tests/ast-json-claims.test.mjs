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
 * THE SATELLITE ROWS ARE IN SCOPE TOO, and the note that said otherwise is why
 * this file needed a second pass. It read: "those rows are measured by
 * `scripts/ast-conformance.mjs`, which runs the satellites nightly". That script
 * does not open this page and never did - every mention of the filename in
 * scripts/ is a pointer inside a comment or an advice string. So two of the three
 * rows were handed to a checker that never took the job, and the carve-rs row
 * then rotted in exactly the direction this file was written to catch, naming
 * carve#672 as a live gap for two days after it closed (carve#965).
 *
 * What the satellite rows are measured against is not a live checkout - this
 * suite has one engine, and a check needing three built satellites is a check
 * that does not run where most changes are written. They are measured against
 * the two ledgers this repo commits, which `npm run ast:check` fills in BY
 * driving those satellites:
 *
 *   resources/ast-position-waivers.txt - every position finding, per engine, per
 *   document, per node type, each either `permitted` under §4 or an issue owing
 *   a fix;
 *   resources/ast-value-divergence.txt - the fields the three publish different
 *   VALUES for, with the issue tracking each.
 *
 * Per carve#966 these checks are not the authority on what the page should say.
 * They report where the page and a committed ledger disagree, and the ledger is
 * the side that was measured.
 *
 * WHAT THEY DO NOT COVER, said out loud so the next reader is not handed a job
 * nobody took: a shape claim about FIELD NAMES. No ledger here records one - the
 * schema panel gates those at zero against a live checkout - so such a claim
 * cannot be checked from this repo, and the carve-php row no longer makes one.
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

import { citedIssues, declaredDebt, parseConformanceTable } from '../scripts/spec/ast-json-table.mjs'
import { PAGE_ANCHORS, countAnchor, flatten } from '../scripts/spec/ast-page-anchors.mjs'
import { RECONCILED_ENGINES, parseWaivers } from '../scripts/spec/ast-waivers.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/ast-json.md'), 'utf8')
const waiverText = readFileSync(resolve(root, 'resources/ast-position-waivers.txt'), 'utf8')
const valueText = readFileSync(resolve(root, 'resources/ast-value-divergence.txt'), 'utf8')

const rows = parseConformanceTable(page)
const rowFor = (engine) => rows.find((row) => row.engines.length === 1 && row.engines[0] === engine)
const jsRow = rowFor('carve-js')?.shape

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
    ['ansi', carveToAnsi],
  ]) {
    const out = render(source)
    assert.ok(
      !out.includes('javascript:'),
      name + ' emitted the denylisted scheme. PART 9 section 25 binds every target that ' +
        'emits a resolvable URL, not the HTML renderer alone.',
    )
  }
})

/*
 * THE ANSI TARGET IS BOUND TOO. When this file first measured the four targets,
 * all three engines printed `click (javascript:alert(1))` while blanking the
 * same destination in Markdown. That was filed as carve#765, answered by all
 * three within the day, and section 25 now names the terminal target explicitly
 * (carve#773).
 *
 * The gated record that the PIN was behind the fix has been deleted, because the
 * pin has caught up - which is what that gate was for. The loop above says it
 * covers "the four targets" and listed three: `carveToAnsi` was imported and
 * never called, so the terminal target section 25 names explicitly was asserted
 * by nothing. Same family as the header note this file was fixed for, one scope
 * smaller, and now `ansi` is in the loop.
 */
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

/*
 * ---------------------------------------------------------------------------
 * THE WHOLE TABLE, RECONCILED AGAINST THE LEDGERS.
 *
 * See the header for why these are here rather than "somebody else's problem".
 * Each one is stated so that it can fail while the page is CORRECT - a guard
 * that only works while a row is already wrong stops working the moment the row
 * is fixed, which is the state this PR reaches (carve#955).
 * ---------------------------------------------------------------------------
 */

/** The declaration lines that OWE a fix, per engine. `permitted` is not debt. */
const owedByEngine = () => {
  const { declared, errors } = parseWaivers(waiverText)
  assert.deepEqual(errors, [], `resources/ast-position-waivers.txt did not parse: ${errors.join('; ')}`)
  const owed = new Map()
  for (const line of declared.values()) {
    if (line.status === 'permitted') continue
    if (!owed.has(line.engine)) owed.set(line.engine, [])
    owed.get(line.engine).push(line)
  }

  return owed
}

/** The permitted node types the ledger records, per engine. */
const permittedByEngine = () => {
  const { declared } = parseWaivers(waiverText)
  const permitted = new Map()
  for (const line of declared.values()) {
    if (line.status !== 'permitted') continue
    if (!permitted.has(line.engine)) permitted.set(line.engine, new Set())
    permitted.get(line.engine).add(line.type)
  }

  return permitted
}

/*
 * How a positions cell spells a permitted category.
 *
 * A ledger type with no entry here fails rather than defaulting to "covered":
 * a new permitted category is a new sentence the page owes, and a map that
 * silently skips what it does not know is the same shape as the scope note this
 * file was fixed for.
 */
const PERMITTED_PHRASE = {
  text: 'coalesced `text` run',
  table_cell: 'table cell',
}

test('every engine the position ledger names has a row, and every reconciled engine its own', () => {
  const named = new Set()
  for (const row of rows) for (const engine of row.engines) named.add(engine)

  for (const engine of permittedByEngine().keys()) {
    assert.ok(
      named.has(engine),
      `resources/ast-position-waivers.txt declares ${engine} and the conformance table has no row for it`,
    )
  }
  for (const engine of RECONCILED_ENGINES) {
    assert.ok(rowFor(engine), `${engine} is reconciled by ast:check but shares a row, or has none`)
  }
})

test('a row names an issue only where a ledger still declares the debt', () => {
  // THE ROT ITSELF. The carve-rs row named carve#672 for two days after the
  // issue closed and its declaration line was deleted, and the carve-php row
  // named carve-php#510 for six days after that issue closed on a full-corpus
  // re-measurement. Both were readable as current state by anyone who did not
  // go and check the issue.
  const debt = declaredDebt({ waivers: waiverText, values: valueText })
  for (const row of rows) {
    for (const cell of [row.shape, row.positions]) {
      for (const issue of citedIssues(cell)) {
        assert.ok(
          debt.has(issue),
          `docs/ast-json.md:${row.lineNo} (${row.engineCell}) cites ${issue}, which neither ` +
            'resources/ast-position-waivers.txt nor resources/ast-value-divergence.txt still ' +
            'declares. A conformance row states measured state; the history goes in the prose below it.',
        )
      }
    }
  }
})

test('a declared position gap is named in its own engine row', () => {
  // The other direction: a ledger may not owe something the table does not show.
  // Vacuous today because the OWED half is empty, and NOT a control - adding one
  // owed line to the ledger fails this without touching the page.
  const debt = owedByEngine()
  for (const [engine, lines] of debt) {
    const row = rowFor(engine)
    assert.ok(row, `${engine} owes ${lines.length} position finding(s) and has no row of its own`)
    const cited = citedIssues(row.positions)
    for (const line of lines) {
      assert.ok(
        cited.has(line.status),
        `resources/ast-position-waivers.txt owes ${line.status} for ${engine} ` +
          `(${line.document}, ${line.type}) and docs/ast-json.md:${row.lineNo} does not name it`,
      )
    }
  }
})

test('a positions cell names exactly the permitted categories its ledger records', () => {
  const permitted = permittedByEngine()
  for (const engine of RECONCILED_ENGINES) {
    const row = rowFor(engine)
    const types = permitted.get(engine) ?? new Set()
    const cell = flatten(row.positions)
    for (const [type, phrase] of Object.entries(PERMITTED_PHRASE)) {
      const named = cell.includes(phrase)
      if (types.has(type)) {
        assert.ok(
          named,
          `resources/ast-position-waivers.txt permits ${type} for ${engine} and ` +
            `docs/ast-json.md:${row.lineNo} does not say so (expected the phrase "${phrase}")`,
        )
      } else {
        assert.ok(
          !named,
          `docs/ast-json.md:${row.lineNo} tells a reader ${engine} omits a ${type} position, ` +
            'and no line in resources/ast-position-waivers.txt records one',
        )
      }
    }
    for (const type of types) {
      assert.ok(
        type in PERMITTED_PHRASE,
        `resources/ast-position-waivers.txt permits "${type}" for ${engine} and nothing here ` +
          'knows how the page spells it - add it to PERMITTED_PHRASE and to the row',
      )
    }
  }
})

test('an engine claiming §3a conformance has the measurement printed below the table', () => {
  // The transcript block under the table is the recorded §3a measurement for all
  // three. A row may not claim conformance the page cannot show.
  for (const row of rows) {
    if (!/§3a conformant/.test(row.shape)) continue
    for (const engine of row.engines) {
      const line = page
        .split('\n')
        .find((candidate) => candidate.trim().startsWith(`${engine}   `) || candidate.trim().startsWith(`${engine}  {`))
      assert.ok(line, `docs/ast-json.md:${row.lineNo} claims §3a conformance for ${engine} with no measured line`)
      for (const field of ['"href"', '"ref"', '"rawRef"']) {
        assert.ok(
          line.includes(field),
          `the §3a transcript for ${engine} does not publish ${field}, and its row claims the whole triple`,
        )
      }
    }
  }
})

test('a paragraph citing the value ledger names only fields it still declares', () => {
  // How the heading-id paragraph went stale: it said `heading.attrs.id` was "a
  // divergence declared in resources/ast-value-divergence.txt", six weeks after
  // carve-rs landed the last producer and the line was deleted. A page that
  // points at a declaration has to point at one that is there.
  const declaredFields = new Set(
    valueText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'))
      .map((line) => line.split(/\s+/)[0]),
  )
  for (const paragraph of page.split('\n\n')) {
    if (!paragraph.includes('resources/ast-value-divergence.txt')) continue
    for (const m of paragraph.matchAll(/`([a-z_]+(?:\.[a-z_]+)+)`/gi)) {
      assert.ok(
        declaredFields.has(m[1]),
        `docs/ast-json.md points at resources/ast-value-divergence.txt for \`${m[1]}\`, ` +
          'which that file no longer declares',
      )
    }
  }
})

test('every clause another file cites still occurs exactly once on the page', () => {
  // The line numbers these replaced had ALL drifted, and the correction carve#965
  // proposed was itself stale on arrival: it put the narrowing clause at 131 when
  // it was at 142. A phrase moves with its paragraph; a line number does not.
  for (const [name, phrase] of Object.entries(PAGE_ANCHORS)) {
    assert.equal(
      countAnchor(page, phrase),
      1,
      `scripts/spec/ast-page-anchors.mjs cites "${name}" as "${phrase}", which docs/ast-json.md ` +
        'no longer contains exactly once - reword the citation or restore the clause',
    )
  }
})
