/*
 * The ohm grammar's BLOCK layer, executed.
 *
 * resources/carve-core.ohm is the second normative file, and until this test
 * existed roughly half of it was parsed at grammar-load time and then never
 * applied to input. scripts/spec/render.mjs matches three start rules -
 * `inlines`, `attrs` and `blockAttrs` - so every rule reachable only through
 * `doc`, `block` or `codeBlock` could be replaced with a literal matching
 * nothing and the whole suite stayed green. Measured: `thematicBreak =
 * "ZZZZZ"` left `npm test` at 1431 pass / 0 fail and `npm run core:check` at
 * 737/737 conformant (carve#916).
 *
 * That is the carve#755 shape at file scale: not one check that cannot fail,
 * but an artifact this repository calls normative and never evaluates. It is
 * how `langInfo` came to read `spaceChar* langToken` - admitting a TAB in the
 * code fence's padding slot - while `resources/grammar.ebnf:354` spelled the
 * same slot `[space]` and PART 7 said a tab is syntax only in a line's leading
 * indentation run. Two normative files, one contradiction, no observer
 * (carve#907).
 *
 * WHAT THIS IS. carve#916 offered three fixes and this is its option 2:
 * execute the block productions NARROWLY, as start rules driven by fixtures,
 * rather than reconciling `doc` against scripts/spec/layout.mjs document by
 * document (option 1, which needs a declared exclusion list for everything the
 * ohm cannot express) or deleting the layer and narrowing the file's stated
 * scope (option 3). Option 2 is what would have caught the defect above, and
 * it is what is here.
 *
 * WHAT THIS IS NOT. A fixture table is not a proof that the ohm and
 * scripts/spec/layout.mjs AGREE about a document - only that each production
 * accepts and rejects what its own text says it does. `doc` is still never run
 * over the corpus. The honest claim is narrow: after this file, a block-layer
 * rule cannot be silently narrowed, widened or emptied. Whether the layer as a
 * whole models the same language the layout automaton implements is carve#916
 * option 1, and it is not answered here.
 *
 * TWO GUARDS, because a fixture table rots in two directions:
 *
 *   - every rule declared in the block layer must appear in CASES, so a rule
 *     added later cannot slip in unexecuted. The layer's extent is read from
 *     the file itself, between `doc = block*` and the INLINE banner, so
 *     nothing has to be kept in sync by hand.
 *   - every rule needs at least one ACCEPT and one REJECT. Accepts alone pass
 *     for a rule widened to `any*`; rejects alone pass for a rule emptied to a
 *     literal nothing matches.
 *
 * The two PARAMETERIZED rules - `headingL<h>` and `codeLine<closer>` - cannot
 * be ohm start rules. They are exercised through their callers instead
 * (`heading` and the two fences), which is enough to kill a `"ZZZZZ"` body in
 * either; the completeness guard knows they are covered that way and says so.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'

const here = dirname(fileURLToPath(import.meta.url))
const ohmPath = resolve(here, '../resources/carve-core.ohm')
const source = readFileSync(ohmPath, 'utf8')
const g = ohm.grammar(source)

const TAB = '\t'
const BOM = '\u{FEFF}'

/*
 * Rule -> what it must accept and what it must reject.
 *
 * Each case is chosen to turn on the production's OWN text, not on a
 * neighbour's: a reject that a caller would have refused anyway proves nothing
 * about the rule under test.
 */
const CASES = {
  // --- the two entry points -------------------------------------------------
  doc: {
    accept: ['', '# T\n\nbody\n', '```\ncode\n```\n', '---\n', 'a\nb\n', '1) a\n'],
    reject: [], // paragraph fallback intentionally covers every nonblank line
  },
  block: {
    accept: ['\n', '# T\n', '---\n', '```\nx\n```\n', 'para\n'],
    reject: [], // paragraph fallback intentionally covers every nonblank line
  },

  // --- blank line -----------------------------------------------------------
  // `blankLine = spaceChar* newline` over `spaceChar = " " | "\t"` is the ohm
  // spelling of `blank_line = {whitespace}, newline` (grammar.ebnf:246) over
  // `whitespace = ' ' | '\t'` (grammar.ebnf:2262). The rejects are the same
  // characters carve#890 pinned in the corpus, arriving here through the other
  // normative file.
  blankLine: {
    accept: ['\n', '   \n', TAB + '\n', ' ' + TAB + ' \n'],
    reject: ['x\n', BOM + '\n', '\u{00A0}\n', '\u{3000}\n', '   '],
  },

  // --- headings -------------------------------------------------------------
  heading: {
    accept: ['# T\n', '###### T\n', '## a b\n', '# T'],
    // seven hashes; and the space after the run is required
    reject: ['####### T\n', '#T\n', ' # T\n', '#\n'],
  },
  hashes: {
    accept: ['#', '##', '######'],
    reject: ['', '#######', ' #'],
  },
  // --- thematic break -------------------------------------------------------
  thematicBreak: {
    accept: ['---\n', '----\n', '***\n', '___\n', '---'],
    reject: ['--\n', '**\n', '__\n', '-*-\n', '--- \n'],
  },

  // --- fenced code ----------------------------------------------------------
  codeBlock: {
    accept: ['```\nx\n```\n', '~~~\nx\n~~~\n', '```js\nx\n```\n'],
    reject: ['``\nx\n``\n', '~~\nx\n~~\n'],
  },
  backtickFence: {
    // The body case is `codeLine<closer>`: only a closer of the OPEN fence's
    // character ends it, so a `~~~` line inside a backtick block is content.
    accept: ['```\nx\n```\n', '```\n~~~\nx\n```\n', '```\n```\n'],
    reject: ['~~~\nx\n~~~\n', '```\nx\n'],
  },
  tildeFence: {
    accept: ['~~~\nx\n~~~\n', '~~~\n```\nx\n~~~\n', '~~~\n~~~\n'],
    reject: ['```\nx\n```\n', '~~~\nx\n'],
  },
  btOpen: {
    accept: ['```', '````', '``````'],
    reject: ['``', '~~~', ''],
  },
  btClose: {
    accept: ['```\n', '````\n', '```   \n', '```'],
    reject: ['``\n', '```x\n', '~~~\n'],
  },
  tdOpen: {
    accept: ['~~~', '~~~~', '~~~~~~'],
    reject: ['~~', '```', ''],
  },
  tdClose: {
    accept: ['~~~\n', '~~~~\n', '~~~   \n', '~~~'],
    reject: ['~~\n', '~~~x\n', '```\n'],
  },

  // --- the fence's info string ---------------------------------------------
  // THE carve#907 DEFECT, executed. The slot before the info string is
  // PADDING and takes `space`, matching `fenced_code_block = code_fence_open,
  // [space], [code_fence_info]` (grammar.ebnf:354). It read `spaceChar*` -
  // a space OR A TAB, and any number of them - which is what a tab reject and
  // a two-space reject now deny.
  langInfo: {
    accept: ['js', ' js', ' c++', 'text/plain'],
    reject: [TAB + 'js', '  js', ' ' + TAB + 'js', ' ', ''],
  },
  langToken: {
    accept: ['js', 'c++', 'objective-c', 'a.b/c', 'C#', 'x_1'],
    reject: ['', 'j s', 'a!b', 'a\nb'],
  },
  langChar: {
    accept: ['a', 'Z', '7', '-', '_', '+', '#', '.', '/'],
    reject: [' ', TAB, '!', '', 'ab'],
  },

  // --- paragraph ------------------------------------------------------------
  paragraph: {
    accept: ['a\n', 'a\nb\n', 'a', '# h\n', '---\n', '```\n', '1) a\n'],
    reject: ['\n', '   \n'],
  },
  paraLine: {
    accept: ['a\n', 'a b\n', 'a', '# h\n', '---\n', ':::\n', '1) a\n'],
    reject: ['\n', '   \n'],
  },
}

/*
 * The parameterized rules, which ohm cannot use as start rules. Named here so
 * the completeness guard can distinguish "covered through a caller" from
 * "forgotten", and so the claim is written down rather than assumed.
 */
const VIA_CALLER = {
  headingL: 'heading',
  codeLine: 'backtickFence and tildeFence',
}

/*
 * The block layer's extent, read from the file. It runs from `doc = block*`
 * (the first block production) to the INLINE banner. Reading it rather than
 * listing it is what makes the completeness guard survive someone adding a
 * rule: there is no second place to update.
 */
const blockLayerRules = () => {
  const start = source.indexOf('  doc        = block*')
  const end = source.indexOf('  // INLINE (Core)')
  assert.ok(start !== -1, 'resources/carve-core.ohm: `doc` production not found')
  assert.ok(end !== -1, 'resources/carve-core.ohm: the INLINE banner not found')
  assert.ok(end > start, 'the INLINE banner moved above `doc`; the layer boundary is wrong')
  const region = source.slice(start, end)
  const names = []
  for (const [, name] of region.matchAll(/^ {2}(\w+)(?:<[^>]*>)?\s*=/gm)) names.push(name)
  return names
}

test('the block layer is a real region of the file, not an empty slice', () => {
  const rules = blockLayerRules()
  assert.ok(
    rules.length >= 20,
    `found only ${rules.length} block-layer rules; the region markers stopped matching, ` +
      `which would make every guard below vacuous`,
  )
})

test('every block-layer rule is executed here, or named as covered through a caller', () => {
  const rules = blockLayerRules()
  const unexecuted = rules.filter(
    (r) =>
      !Object.hasOwn(CASES, r) &&
      !Object.hasOwn(VIA_CALLER, r) &&
      // `inlines` is the render pipeline's own start rule and is executed by
      // every corpus document; it sits in this region only for proximity to
      // `doc`.
      r !== 'inlines',
  )
  assert.deepEqual(
    unexecuted,
    [],
    `resources/carve-core.ohm declares block-layer rule(s) nothing evaluates: ${unexecuted.join(', ')}. ` +
      `Add accept/reject cases to CASES, or - if the rule is only reachable through another ` +
      `and cannot be an ohm start rule - name its caller in VIA_CALLER. A normative production ` +
      `no gate runs is the defect carve#916 is about.`,
  )
})

test('every rule named in CASES still exists in the grammar', () => {
  const rules = new Set(blockLayerRules())
  const stale = Object.keys(CASES).filter((r) => !rules.has(r))
  assert.deepEqual(
    stale,
    [],
    `CASES names rule(s) the block layer no longer declares: ${stale.join(', ')}. ` +
      `Renamed or moved? A case for a rule that is gone tests nothing.`,
  )
  const staleVia = Object.keys(VIA_CALLER).filter((r) => !rules.has(r))
  assert.deepEqual(staleVia, [], `VIA_CALLER names rule(s) that are gone: ${staleVia.join(', ')}`)
})

test('every rule carries both an accept and a reject case', () => {
  // Accepts alone pass for a rule widened to `any*`; rejects alone pass for a
  // rule emptied to a literal nothing matches. Both directions or neither.
  const thin = Object.entries(CASES)
    .filter(([rule]) => rule !== 'doc' && rule !== 'block')
    .filter(([, c]) => c.accept.length === 0 || c.reject.length === 0)
    .map(([r]) => r)
  assert.deepEqual(thin, [], `rule(s) with a one-sided fixture table: ${thin.join(', ')}`)
})

for (const [rule, { accept, reject }] of Object.entries(CASES)) {
  test(`ohm block layer: ${rule}`, () => {
    for (const input of accept) {
      const m = g.match(input, rule)
      assert.ok(
        m.succeeded(),
        `${rule} must accept ${JSON.stringify(input)}, and does not.\n  ${m.message}`,
      )
    }
    for (const input of reject) {
      assert.ok(
        g.match(input, rule).failed(),
        `${rule} must reject ${JSON.stringify(input)}, and accepts it. ` +
          `A production that accepts what resources/grammar.ebnf denies is the two ` +
          `normative files disagreeing, which is exactly what nothing could report ` +
          `before this file existed.`,
      )
    }
  })
}
