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
 * resources/examples/edge-cases.md so it is pinned forever after.
 *
 * Usage:
 *   node scripts/combinatorial-check.mjs
 *   node scripts/combinatorial-check.mjs --verbose   # print every document
 *   node scripts/combinatorial-check.mjs --inventory # list families, no engines
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { carveToHtml } from '@markup-carve/carve'
import { parse as specParse, Refuse } from './spec/layout.mjs'
import { renderDoc as specRender } from './spec/html.mjs'
import { miscount, shortfall } from './spec/participants.mjs'
import { phpDir, rustDir } from './lib/engine-locations.mjs'

const verbose = process.argv.includes('--verbose')
const inventoryOnly = process.argv.includes('--inventory')

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

function* headingDocuments() {
  for (const heading of HEADINGS) {
    for (const attrs of ATTRS) {
      for (const container of CONTAINERS) {
        for (const body of BODIES) {
          const head = attrs.line ? `${attrs.line}\n${heading}` : heading
          const inner = body.text ? `${head}\n\n${body.text}` : head
          yield {
            id: `heading/${heading.length}h/${attrs.name}/${container.name}/${body.name}`,
            source: `${container.wrap(inner)}\n`,
          }
        }
      }
    }
  }
}

/*
 * Each family below is its OWN small product. Combining all dimensions into
 * one product would turn 304 useful probes into millions of mostly meaningless
 * documents. These are the seams found by the 2026-08-16 differential sweep
 * (carve#1288), plus the two clean control sweeps recorded there.
 */

// An opener without its closer. Some entries are deliberately literal
// controls: the family records all 18 inline spellings that were swept, not
// only the six verbatim/bracket runs that originally diverged.
const UNCLOSED_INLINE_RUNS = [
  { name: 'code-1', open: '`' },
  { name: 'code-2', open: '``' },
  { name: 'math-inline', open: '$`' },
  { name: 'math-display', open: '$$`' },
  { name: 'literal-inline', open: '!`' },
  { name: 'inline-footnote', open: '^[' },
  { name: 'link-label', open: '[' },
  { name: 'image-alt', open: '![' },
  { name: 'extension', open: ':name[' },
  { name: 'emphasis', open: '/' },
  { name: 'strong', open: '*' },
  { name: 'bold-italic', open: '/*' },
  { name: 'underline', open: '_' },
  { name: 'strike', open: '~' },
  { name: 'highlight', open: '=' },
  { name: 'forced-strong', open: '{*' },
  { name: 'forced-super', open: '{^' },
  { name: 'editorial-addition', open: '{+' },
]

const UNCLOSED_CONTAINERS = [
  { name: 'top-level', wrap: (open) => `a ${open}b\nc d` },
  { name: 'blockquote', wrap: (open) => prefixLines(`a ${open}b\nc d`, '> ') },
  { name: 'div', wrap: (open) => `:::\na ${open}b\nc d\n:::` },
  { name: 'list-item', wrap: (open) => `- ${indentContinuation(`a ${open}b\nc d`, '  ')}` },
  { name: 'quoted-div', wrap: (open) => prefixLines(`:::\na ${open}b\nc d\n:::`, '> ') },
  { name: 'line-block', wrap: (open) => `::: |\na ${open}b\nc d\n:::` },
  // A cell is already a block boundary. Keeping this probe on one physical
  // line tests whether its closing pipe remains block syntax, not run content.
  { name: 'table-cell', wrap: (open) => `| a ${open}b | c d |` },
]

function* unclosedInlineDocuments() {
  for (const run of UNCLOSED_INLINE_RUNS) {
    for (const container of UNCLOSED_CONTAINERS) {
      yield {
        id: `unclosed-inline/${run.name}/${container.name}`,
        source: `${container.wrap(run.open)}\n`,
      }
    }
  }
}

const FLOATING_ATTRIBUTE_CONTAINERS = [
  { name: 'blockquote', prefix: '> q\n> {.k}\n' },
  { name: 'list-item', prefix: '- a\n  {.k}\n' },
  { name: 'definition-body', prefix: ':: t\n:  d\n   {.k}\n' },
]

const FLOATING_ATTRIBUTE_FOLLOWERS = [
  { name: 'column-zero-line', source: 'tail' },
  { name: 'blank-then-line', source: '\ntail' },
  { name: 'heading', source: '# H' },
  { name: 'table', source: '| a | b |' },
]

function* floatingAttributeDocuments() {
  for (const container of FLOATING_ATTRIBUTE_CONTAINERS) {
    for (const follower of FLOATING_ATTRIBUTE_FOLLOWERS) {
      yield {
        id: `floating-attribute/${container.name}/${follower.name}`,
        source: `${container.prefix}${follower.source}\n`,
      }
    }
  }
}

const TERMINAL_CHILDREN = [
  { name: 'heading', source: '# H' },
  { name: 'line-comment', source: '%% hidden' },
  { name: 'comment-block', source: '%%%\nhidden\n%%%' },
  { name: 'table', source: '| a | b |' },
  { name: 'thematic-break', source: '***' },
  { name: 'link-definition', source: '[r]: /u' },
  { name: 'footnote-definition', source: '[^f]: note' },
  { name: 'attribute-block', source: '{.k}' },
  { name: 'closed-fence', source: '```\nx\n```' },
  { name: 'bare-div', source: ':::\n:::' },
  { name: 'nested-quote', source: '> p' },
]

const TERMINAL_CHILD_CONTAINERS = [
  { name: 'list-item', wrap: (child) => `- ${indentContinuation(child, '  ')}` },
  { name: 'blockquote', wrap: (child) => prefixLines(child, '> ') },
]

function* terminalChildDocuments() {
  for (const child of TERMINAL_CHILDREN) {
    for (const container of TERMINAL_CHILD_CONTAINERS) {
      yield {
        id: `terminal-child/${child.name}/${container.name}`,
        source: `${container.wrap(child.source)}\ntail\n`,
      }
    }
  }
}

const ORDERED_MARKERS = [
  { name: 'bare-dot', marker: '. ' },
  { name: 'numbered-dot', marker: '1. ' },
]

const ORDERED_DEFINITIONS = [
  { name: 'link', source: '[r]: /u', use: 'see [x][r]' },
  { name: 'footnote', source: '[^f]: note', use: 'see[^f]' },
  { name: 'abbreviation', source: '*[HTML]: Hypertext', use: 'HTML' },
  { name: 'citation', source: '[@r]: Entry', use: 'see [@r]' },
]

function* orderedMarkerDocuments() {
  for (const marker of ORDERED_MARKERS) {
    for (const definition of ORDERED_DEFINITIONS) {
      yield {
        id: `ordered-marker/${marker.name}/${definition.name}`,
        source: `${marker.marker}x\n${definition.source}\n\n${definition.use}\n`,
      }
    }
  }
}

// The two hand sweeps that found no divergence are executable controls now.
// Their value is negative knowledge: the next sweep does not spend an hour
// rediscovering that these positions were already crossed.
const CAPTION_POSITIONS = [
  { name: 'image-adjacent', source: '![a](/u)\n^ cap' },
  { name: 'image-one-blank', source: '![a](/u)\n\n^ cap' },
  { name: 'image-two-blanks', source: '![a](/u)\n\n\n^ cap' },
  { name: 'table-adjacent', source: '| a | b |\n^ cap' },
  { name: 'table-one-blank', source: '| a | b |\n\n^ cap' },
  { name: 'quote-adjacent', source: '> q\n^ cap' },
  { name: 'quote-one-blank', source: '> q\n\n^ cap' },
  { name: 'code-adjacent', source: '```\nx\n```\n^ cap' },
  { name: 'math-adjacent', source: '$$`x`\n^ cap' },
  { name: 'figure-group-adjacent', source: '::: figure\n![a](/u)\n:::\n^ cap' },
]

function* captionDocuments() {
  for (const position of CAPTION_POSITIONS) {
    yield { id: `caption-position/${position.name}`, source: `${position.source}\n` }
  }
}

const ATTACHED_BLOCK_POSITIONS = [
  { name: 'top-level', source: 'a\n+ b' },
  { name: 'blockquote', source: '> a\n> + b' },
  { name: 'list-item', source: '- a\n  + b' },
  { name: 'div', source: ':::\na\n+ b\n:::' },
  { name: 'definition-body', source: ':: t\n:  a\n   + b' },
  { name: 'footnote-body', source: '[^f]: a\n      + b\n\nsee[^f]' },
]

function* attachedBlockDocuments() {
  for (const position of ATTACHED_BLOCK_POSITIONS) {
    yield { id: `attached-block/${position.name}`, source: `${position.source}\n` }
  }
}

const FAMILIES = [
  {
    name: 'heading-attributes',
    expected: HEADINGS.length * ATTRS.length * CONTAINERS.length * BODIES.length,
    generate: headingDocuments,
  },
  {
    name: 'unclosed-inline',
    expected: UNCLOSED_INLINE_RUNS.length * UNCLOSED_CONTAINERS.length,
    generate: unclosedInlineDocuments,
  },
  {
    name: 'floating-attribute',
    expected: FLOATING_ATTRIBUTE_CONTAINERS.length * FLOATING_ATTRIBUTE_FOLLOWERS.length,
    generate: floatingAttributeDocuments,
  },
  {
    name: 'terminal-child',
    expected: TERMINAL_CHILDREN.length * TERMINAL_CHILD_CONTAINERS.length,
    generate: terminalChildDocuments,
  },
  {
    name: 'ordered-marker',
    expected: ORDERED_MARKERS.length * ORDERED_DEFINITIONS.length,
    generate: orderedMarkerDocuments,
  },
  { name: 'caption-position', expected: CAPTION_POSITIONS.length, generate: captionDocuments },
  {
    name: 'attached-block',
    expected: ATTACHED_BLOCK_POSITIONS.length,
    generate: attachedBlockDocuments,
  },
]

// A declared finding is still printed, counted and linked; it simply does not
// keep the weekly job permanently red while its focused issue is being fixed.
// The declaration is exact by document id. Remove entries with the fix: a
// declaration that no longer reproduces is stale and is rejected below.
const DECLARED_DIVERGENCES = new Map([
  ...UNCLOSED_CONTAINERS.map((container) => [
    `unclosed-inline/literal-inline/${container.name}`,
    'https://github.com/markup-carve/carve/issues/1418',
  ]),
  [
    'terminal-child/line-comment/blockquote',
    'https://github.com/markup-carve/carve/issues/1419',
  ],
  [
    'terminal-child/comment-block/blockquote',
    'https://github.com/markup-carve/carve/issues/1419',
  ],
])

function* documents() {
  for (const family of FAMILIES) {
    for (const doc of family.generate()) yield { ...doc, family: family.name }
  }
}

if (inventoryOnly) {
  let total = 0
  for (const family of FAMILIES) {
    const actual = [...family.generate()].length
    console.log(`${family.name.padEnd(20)} ${actual}`)
    if (actual !== family.expected) {
      console.error(`inventory mismatch: ${family.name} generated ${actual}, expected ${family.expected}`)
      process.exit(2)
    }
    total += actual
  }
  console.log(`${'total'.padEnd(20)} ${total}`)
  process.exit(0)
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
  const familyCounts = new Map(FAMILIES.map((family) => [family.name, 0]))

  for (const doc of documents()) {
    count++
    familyCounts.set(doc.family, familyCounts.get(doc.family) + 1)
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

  /*
   * HOW MANY DOCUMENTS THE MATRIX ACTUALLY PRODUCED (carve#755, variant 2).
   *
   * Measured before this guard existed: emptying HEADINGS left `documents()`
   * yielding nothing, and the run printed `0 documents x 2 engines` followed by
   * `no divergences` and exited 0. The engine guard above is the sibling check
   * and does not cover this - a matrix with an empty dimension compares two
   * real engines on nothing at all.
   *
   * Two different failures, so two checks. The floor catches a dimension that
   * emptied; the exact count catches a `continue` in the loop above dropping
   * cases the generator did produce. The expected value is the matrix's own
   * dimensions, which is why each family records its product independently
   * rather than deriving the expectation from `documents()` - a count compared
   * against itself cannot fail.
   */
  for (const family of FAMILIES) {
    const actual = familyCounts.get(family.name)
    const population =
      shortfall({
        label: `FAMILY ${family.name}`,
        actual,
        atLeast: 1,
        of: 'document(s)',
        hint: 'One of this family\'s axes is empty.',
      }) ??
      miscount({
        label: `FAMILY ${family.name}`,
        actual,
        expected: family.expected,
        of: 'document(s)',
      })
    if (population !== null) {
      console.error(`\n${population}`)
      console.error('No cross-engine claim below describes the matrix this script defines.')
      process.exit(2)
    }
  }

  const report = (title, rows, format, { fail = true } = {}) => {
    if (!rows.length) return
    console.log(`\n${title} (${rows.length})\n${'='.repeat(60)}`)
    for (const row of rows) console.log(format(row))
    if (fail) exitCode = 1
  }

  const formatDivergence = ({ doc, rendered }) => {
    const counts = new Map()
    for (const [, html] of rendered) counts.set(html, (counts.get(html) ?? 0) + 1)
    const majority = Math.max(...counts.values())
    const lines = rendered.map(([name, html]) => {
      const flag = counts.get(html) < majority ? '  <-- differs' : ''
      return `    ${name.padEnd(10)} ${JSON.stringify(html)}${flag}`
    })
    const issue = DECLARED_DIVERGENCES.get(doc.id)
    const declaration = issue ? `\n    declared: ${issue}` : ''
    return `\n  ${doc.id}${declaration}\n  ${JSON.stringify(doc.source)}\n${lines.join('\n')}`
  }

  const declared = divergences.filter(({ doc }) => DECLARED_DIVERGENCES.has(doc.id))
  const unexpected = divergences.filter(({ doc }) => !DECLARED_DIVERGENCES.has(doc.id))
  const reproduced = new Set(declared.map(({ doc }) => doc.id))
  // A missing dissenting engine can make a declaration look stale locally.
  // CI provisions all four; only a complete population may retire debt.
  const staleDeclarations =
    available.length === engines.length
      ? [...DECLARED_DIVERGENCES].filter(([id]) => !reproduced.has(id))
      : []

  report('DECLARED DIVERGENCES', declared, formatDivergence, { fail: false })
  report('UNDECLARED DIVERGENCES', unexpected, formatDivergence)
  report(
    'STALE DIVERGENCE DECLARATIONS',
    staleDeclarations,
    ([id, issue]) => `\n  ${id}\n    no longer reproduces; remove declaration for ${issue}`,
  )

  report(
    'INVARIANT VIOLATIONS',
    violations,
    ({ doc, engine, invariant, detail }) =>
      `\n  ${doc.id}\n  ${JSON.stringify(doc.source)}\n    ${engine}: ${invariant} - ${detail}`,
  )

  console.log(
    `\n${count} documents x ${available.length} engines` +
      `\ndivergences: ${divergences.length} (${declared.length} declared, ${unexpected.length} undeclared)` +
      `\ninvariant violations: ${violations.length}` +
      // Not a failure: the executable spec models a narrower subset than the
      // language. Counted anyway, because a refusal silently dropped is a
      // document nobody compared.
      `\nrefused (not compared): ${refusals.length}`,
  )
  console.log('\nfamilies:')
  for (const family of FAMILIES) {
    console.log(`  ${family.name.padEnd(20)} ${familyCounts.get(family.name)}`)
  }

  // Render OPTIONS are a axis this cannot walk yet, and saying so beats a
  // silently narrower run: neither the carve-rs nor the carve-php CLI exposes
  // `sections` or source-line stamping, and the executable spec implements
  // neither. Wiring those flags promotes the option axis from "carve-js only,
  // invariants only" to a real differential.
  console.log(
    '\nnot covered: render options (sections, sourceLine) - no CLI flag in ' +
      'carve-rs / carve-php, unimplemented in the executable spec',
  )

  if (exitCode === 0) console.log('\nno undeclared divergences')
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}

process.exit(exitCode)
