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
  'carve-version-unsupported': '---\ncarve-version: 99.0\n---\n\nx\n',
  'unclosed-container-fence': '::: note\nbody\n',
  'fence-title-syntax': '::: note Some Title\nbody\n:::\n',
  'platform-mention-token': {
    source: 'Use @minutely for that cron alias.\n',
    options: { platforms: ['github'] },
  },
  'platform-issue-reference': {
    source: 'See #123 for the discussion.\n',
    options: { platforms: ['github'] },
  },
}

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

test('every rule the page lists can actually be emitted', () => {
  const unproducible = documentedRules().filter((rule) => !(rule in TRIGGERS))
  assert.deepEqual(
    unproducible,
    [],
    `docs/validation.md lists rule id(s) with no trigger here: ${unproducible.join(', ')}. ` +
      'Add one, or remove the row - a documented rule nothing can produce is a promise ' +
      'with no producer.',
  )
})
