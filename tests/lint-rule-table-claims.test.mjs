/*
 * docs/validation.md's rule table says "the table above is carve-js", and nothing
 * measured it. It was two rules short: `unclosed-container-fence` and
 * `fence-title-syntax` both fire on ordinary input and appeared nowhere on the
 * page.
 *
 * That matters more here than in most catalogs, because the same page says
 *
 *   **A lint rule id is spec surface.** Two implementations reporting the same
 *   condition MUST use the same id [...] anything keyed on the id - a CI filter,
 *   an editor suppression, a `# carve-lint-disable` comment - is otherwise
 *   unshareable
 *
 * An id nobody can look up is the same problem one step earlier: a rule fires,
 * the author searches the page for its name, and finds nothing.
 *
 * BOTH DIRECTIONS, because they fail differently:
 *
 *   - a rule the engine emits and the page omits is what happened here;
 *   - a rule the page lists that nothing can emit is the shape `refId` had in
 *     the AST schema (carve#749) - a promise with no producer.
 *
 * The trigger map is what makes the second direction checkable, so it is itself
 * asserted: every entry must actually provoke the rule it names.
 *
 * A THIRD DIRECTION arrived with carve#297's opt-in rules, and neither of the
 * two above reaches it. A rule the page documents as OFF BY DEFAULT that fires
 * anyway is on the page, is emittable, and provokes its trigger - green on
 * every check here - while breaking the one property the ruling turned on. So
 * "reports nothing until asked for" is asserted on its own, against the same
 * documents the triggers use.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintCarve } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/validation.md'), 'utf8')

/**
 * A document that provokes each documented rule, with the options it needs.
 *
 * A bare string is a document linted with DEFAULT options, which is what every
 * rule reporting a silent failure in Carve takes. The two platform autolink
 * rules are opt-in and platform-scoped (carve#297), so they carry a `platforms`
 * selection with them - a rule nothing can call is undocumentable, and before
 * this map could pass options, adding those rows to the page would have failed
 * the "can actually be emitted" check below for the wrong reason.
 *
 * The default-off half is then asserted SEPARATELY rather than inferred from
 * the shape of this map. An engine that started reporting them unasked would
 * satisfy every check here, because a rule that fires under both default and
 * opt-in options provokes its trigger either way.
 */
const TRIGGERS = {
  'bidi-control-in-source': 'a‮b\n',
  'duplicate-heading-id': '# A\n\n# A\n',
  'broken-crossref': 'see </#nope>\n',
  'unresolved-reference-link': 'see [text][nope]\n',
  'unresolved-footnote': 'see[^nope]\n',
  'duplicate-footnote-definition': 'x[^a]\n\n[^a]: one\n\n[^a]: two\n',
  'unused-footnote-definition': 'text\n\n[^a]: never used\n',
  'heading-trailing-attribute': '# Title {#id}\n',
  'raw-block-syntax': '```raw html\nx\n```\n',
  'blockquote-marker-without-space': '>quoted\n',
  'block-marker-as-text': '  ::: note\n',
  'fence-delimiter-indentation': '  ```\n  x\n  ```\n',
  'list-item-body-detached': '1. item\n\n  # heading\n',
  'list-item-block-overindented': '-{.x1} item\n\n       # heading\n',
  'carve-version-unsupported': '---\ncarve-version: 99.0\n---\n\nx\n',
  'unclosed-container-fence': '::: note\nbody\n',
  'figure-group-nested': ':::: figure\n::: figure\n![a](a.png)\n^ (a) A\n:::\n::::\n^ Figure #: G\n',
  'figure-group-opener-metadata': '::: figure "Title"\n![a](a.png)\n^ (a) A\n:::\n',
  'figure-group-panel-number': '::: figure\n![a](a.png)\n^ Figure #: panel\n:::\n^ Figure #: G\n',
  'figure-group-empty': '::: figure\njust a paragraph\n:::\n^ Figure #: G\n',
  'figure-group-single-panel': '::: figure\n![a](a.png)\n^ (a) A\n:::\n^ Figure #: G\n',
  'fence-title-syntax': '::: note Some Title\nbody\n:::\n',
  'platform-mention-token': {
    source: 'Use @minutely for that cron alias.\n',
    options: { platforms: ['github'] },
  },
  'platform-issue-reference': {
    source: 'See #123 for the discussion.\n',
    options: { platforms: ['github'] },
  },
  'footnote-labels-differ-only-in-whitespace': 'see [^a b] and [^a  b]\n\n[^a b]: one\n\n[^a  b]: two\n',
  // A COMPLETE row, because the rule is gated on the parser's row predicate: a
  // leading `|` with no closing one is a paragraph, and there is no cell for
  // the block to be misplaced in.
  'table-cell-attribute-before-marker': '|{#x}< content |\n',
  'table-alignment-run-padding': '|>text |\n',
  'table-column-arity': '{aligns="left"}\n| a | b |\n',
  'table-column-overlap': '{aligns="left"}\n|=> H |\n',
  'table-width-total': '{widths="60,50"}\n| a | b |\n',
  // `kbd`, not `cite`: PART 9 §10 moved `samp`, `var`, `cite` and `dfn` into the
  // SemanticSpan extension, so in a core lint they are ordinary attributes and
  // provoke nothing. `kbd` is one of the three names core still reserves, which
  // is the case the page's row names first.
  'semantic-attribute-value-ignored': '[x]{kbd="https://example.org/dune"}\n',
  'semantic-attribute-outside-span': '`c`{kbd}\n',
  'braced-comment-in-a-template-source': '{% if user %}\n',
}

/*
 * A rule id the build carries but no trigger names.
 *
 * `collectPortableWhitespace` is retained behind an explicit `void` reference
 * in carve-js and called from nowhere, so `portable-quote-marker-space` cannot
 * be emitted by any input or option. It is listed here rather than silently
 * skipped: the scan below would otherwise report it forever, and a reader has
 * to be able to tell "no producer, known" from "no producer, nobody noticed".
 */
const UNPRODUCIBLE_IN_BUILD = new Set(['portable-quote-marker-space'])

/*
 * A rule the PAGE specifies and the pinned build does not carry yet.
 *
 * A lint rule id is spec surface, so it is specified here first and implemented
 * afterwards - the same window `resources/engine-pin-drift.txt` describes for
 * corpus documents, and for the same reason: the corpus and this page are
 * allowed to run ahead of the pin, and what must never happen is not knowing
 * which window you are in.
 *
 * There was no such window before carve#1281, which meant a rule could not be
 * specified ahead of carve-js at all: the "can actually be emitted" check below
 * demanded a trigger, and a trigger demanded an implementation. That is a
 * chicken-and-egg on a page whose whole point is that the id is agreed BEFORE
 * two engines pick different ones.
 *
 * It fails in BOTH directions, which is what keeps it a check rather than an
 * escape hatch:
 *
 *   - listed here and the pin DOES emit it -> the window closed, delete the
 *     line and add a trigger, in the commit that moves the pin;
 *   - listed here and absent from the page -> a declaration about nothing.
 */
const NOT_IN_THE_PIN_YET = new Map([
  [
    'colon-fence-length-mismatch',
    'specified by markup-carve/carve#1727; the carve-js implementation is landing alongside this spec change',
  ],
  [
    'unattached-block-attribute',
    'specified by markup-carve/carve#1281; no engine implements it yet',
  ],
  [
    'table-marker-run-padding',
    'specified by markup-carve/carve#1464; no engine emits it yet, and it ' +
      'supersedes table-alignment-run-padding once they do',
  ],
])

/** The rules this map calls with options, i.e. the ones that are not default-on. */
const OPT_IN = Object.entries(TRIGGERS)
  .filter(([, entry]) => typeof entry !== 'string')
  .map(([rule]) => rule)

/** `{ source, options }` for either spelling of a trigger entry. */
function trigger(entry) {
  return typeof entry === 'string' ? { source: entry, options: undefined } : entry
}

/** The rule ids a document provokes under the given options. */
function rulesFor({ source, options }) {
  return (lintCarve(source, options) ?? []).map((w) => w.rule)
}

/** Rule ids the table lists, as data. */
function documentedRules() {
  const rows = page.split('\n').filter((line) => /^\| `[a-z][a-z0-9-]+` \|/.test(line))

  return rows.map((row) => /^\| `([a-z0-9-]+)`/.exec(row)[1]).sort()
}

/** Every rule id this engine emits across the triggers. */
function emittedRules() {
  const seen = new Set()
  for (const entry of Object.values(TRIGGERS)) {
    for (const rule of rulesFor(trigger(entry))) seen.add(rule)
  }

  return [...seen].sort()
}

test('the table was actually read', () => {
  // A row format change would otherwise turn both comparisons into statements
  // about an empty list.
  assert.ok(documentedRules().length > 10, `found ${documentedRules().length} documented rule(s)`)
})

test('every trigger provokes the rule it names', () => {
  // The trigger map is the instrument for the check below, so it is checked
  // first: an entry that stopped provoking its rule would silently shrink the
  // emitted set and make the page look complete.
  const broken = []
  for (const [rule, entry] of Object.entries(TRIGGERS)) {
    const ids = rulesFor(trigger(entry))
    if (!ids.includes(rule)) broken.push(`${rule} (got ${ids.join(', ') || 'nothing'})`)
  }
  assert.deepEqual(broken, [], `trigger(s) that no longer provoke their rule: ${broken.join('; ')}`)
})

test('every rule the engine emits is on the page', () => {
  const undocumented = emittedRules().filter((rule) => !documentedRules().includes(rule))
  assert.deepEqual(
    undocumented,
    [],
    `carve-js emits rule id(s) docs/validation.md does not list: ${undocumented.join(', ')}. ` +
      'The page calls a rule id spec surface, so an id nobody can look up is a broken contract.',
  )
})

test('an opt-in rule reports nothing until it is asked for', () => {
  // carve#297 ruled these rules OFF BY DEFAULT, and that is the load-bearing
  // half rather than a convenience. Every other rule on the page reports a
  // silent failure IN CARVE; these two report a hazard in some other system's
  // re-rendering of the output, which is meaningless for a PDF pipeline. The
  // ruling's own argument is that an over-eager rule people disable wholesale
  // would be worse than no rule.
  //
  // Nothing above this line would notice a regression: a rule that fired under
  // both default and opt-in options provokes its trigger either way, and would
  // be on the page and emittable exactly as required.
  assert.ok(OPT_IN.length > 0, 'no opt-in rule in TRIGGERS; this check would be vacuous')
  const leaked = []
  for (const rule of OPT_IN) {
    const { source } = trigger(TRIGGERS[rule])
    // The same document its own trigger uses, linted with NO options - so a
    // pass cannot come from a document that fails to carry the token.
    const ids = rulesFor({ source, options: undefined })
    if (ids.includes(rule)) leaked.push(rule)
    // An explicitly EMPTY selection is the other spelling of "not asked for",
    // and it is the one a config file threading a list through is most likely
    // to produce.
    const empty = rulesFor({ source, options: { platforms: [] } })
    if (empty.includes(rule)) leaked.push(`${rule} (empty platform list)`)
  }
  assert.deepEqual(
    leaked,
    [],
    `rule(s) reported without being asked for: ${leaked.join(', ')}. ` +
      'docs/validation.md states a processor MUST NOT report these unless the ' +
      'caller names a platform.',
  )
})

/*
 * THE SCAN, because the comparison above cannot see a rule it was never told
 * about.
 *
 * `emittedRules()` runs the TRIGGERS documents, so the set it produces is
 * bounded by the rules already documented. A rule the engine gained with a
 * condition no trigger document meets contributes nothing to it, and "every
 * rule the engine emits is on the page" passes while the page is short. That
 * is not hypothetical: at the pin this test was extended on, carve-js emitted
 * `footnote-labels-differ-only-in-whitespace`,
 * `semantic-attribute-value-ignored` and `semantic-attribute-outside-span`,
 * the page listed none of the three, and every assertion above was green.
 *
 * So the ids are read out of the pinned build itself instead of being inferred
 * from what this file already knows to ask for. That reads a build artifact,
 * which is brittle by nature - the floor is what makes the brittleness loud: a
 * bundler change that stops matching the pattern fails here rather than
 * quietly turning the check into a statement about an empty list.
 *
 * THE PATTERN IS DELIBERATELY BROAD - every kebab-case string literal in the
 * file, not the ids in one emission form. carve-js spells a rule id three ways
 * today: `rule: 'x'` in a warning object, a positional `push(…, 'x', …)`, and
 * an entry in a rule tuple. A pattern per form is a pattern per form somebody
 * has to remember to add, which is the same blindness one level down; matching
 * every kebab literal costs a `NOT_A_RULE` line the first time a non-rule
 * kebab string appears, and that entry is visible where an unmatched form is
 * not. Measured at the pin: 21 literals, all 21 of them rule ids, no noise.
 */
// Internal list-indentation grouping labels in the pinned linter. They merge
// adjacent diagnostics; neither string is ever emitted as a warning rule id.
const NOT_A_RULE = new Set(['definition-list', 'footnote-definition'])

function ruleIdsInBuild() {
  const lintSource = readFileSync(
    new URL('../node_modules/@markup-carve/carve/dist/lint.js', import.meta.url),
    'utf8',
  )
  const literals = [...lintSource.matchAll(/['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)['"]/g)].map((m) => m[1])

  return [...new Set(literals)].filter((id) => !NOT_A_RULE.has(id)).sort()
}

test('the build was actually scanned', () => {
  const found = ruleIdsInBuild()
  assert.ok(
    found.length >= 18,
    `only ${found.length} rule id(s) found in the pinned build; the scan pattern no longer matches ` +
      'how carve-js spells a rule id, so the check below is about an empty list.',
  )
})

test('every rule id in the pinned build is on the page', () => {
  const documented = documentedRules()
  const missing = ruleIdsInBuild().filter(
    (rule) => !documented.includes(rule) && !UNPRODUCIBLE_IN_BUILD.has(rule),
  )
  assert.deepEqual(
    missing,
    [],
    `the pinned carve-js build carries rule id(s) docs/validation.md does not list: ${missing.join(', ')}. ` +
      'A warning a user can read in their terminal and nowhere else is the contract this page exists to keep.',
  )
})

test('every rule the page lists can actually be emitted', () => {
  const unproducible = documentedRules().filter(
    (rule) => !(rule in TRIGGERS) && !NOT_IN_THE_PIN_YET.has(rule),
  )
  assert.deepEqual(
    unproducible,
    [],
    `docs/validation.md lists rule id(s) with no trigger here: ${unproducible.join(', ')}. ` +
      'Add one, or remove the row - a documented rule nothing can produce is a promise ' +
      'with no producer. If the rule is specified ahead of the engines, declare it in ' +
      'NOT_IN_THE_PIN_YET with the ticket that specifies it.',
  )
})

test('a rule declared as unimplemented is on the page and is still unimplemented', () => {
  // The declaration's own two directions. Without the first it can name a rule
  // the page never mentions; without the second it outlives the engine work and
  // becomes the thing being tested rather than a note about a window.
  const documented = documentedRules()
  const orphaned = [...NOT_IN_THE_PIN_YET.keys()].filter((rule) => !documented.includes(rule))
  assert.deepEqual(
    orphaned,
    [],
    `NOT_IN_THE_PIN_YET names rule id(s) docs/validation.md does not list: ${orphaned.join(', ')}.`,
  )

  const arrived = [...NOT_IN_THE_PIN_YET.keys()].filter((rule) => ruleIdsInBuild().includes(rule))
  assert.deepEqual(
    arrived,
    [],
    `the pinned build now carries ${arrived.join(', ')}. Delete the NOT_IN_THE_PIN_YET line ` +
      'and add a TRIGGERS entry, in the commit that moves the pin.',
  )
})
