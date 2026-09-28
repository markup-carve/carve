/*
 * A DEFINITION DESCRIPTION'S REACH PAST A COLUMN-ZERO FENCE RUN IS A LIST ITEM'S
 * (carve#2486).
 *
 * CARVE-P0-014 is explicit that the container KIND is not a parameter: "the reach
 * of a container is not extended by what its innermost block happens to be, and
 * the parameter S4 consults is whether ANY container in the open stack holds an
 * OPEN PARAGRAPH". CARVE-P0-013 then settles the code-fence half - a verbatim
 * body holds no paragraph, so the column-zero line takes S4's otherwise, the
 * containers close, and the residue re-parses outside.
 *
 * The oracle answered that one way in a list item and the other in a `dd`. Two
 * sites, one clause:
 *
 *   - `descriptionOpenFenceAt` asked §10 I4 with `bodyLeavesParagraphOpen`, which
 *     skips a trailing blank run by design - it answers for a body whose LAST
 *     BLOCK is what a lazy line folds into. Over a PREFIX that ends at a blank it
 *     reported an open paragraph the blank had already closed, so a body-internal
 *     fence was held to needing a closer and opened nothing. The item collector
 *     reads `openPara`, which the blank clears. CARVE-P0-014 names the blank as
 *     the control: "a blank closes the paragraph so S4's otherwise governs".
 *
 *   - the body's lazy fold refused a code fence but not a COLON fence, so a valid
 *     `:::` opener or closer below the body's column folded as text where the item
 *     collector ends on it.
 *
 * MEASURED. carve-js `479383f48` and carve-php `5db15ff9`, built from source and
 * run on 2026-09-28, end the `dl` exactly as they end the `ul` on all 18 rows of
 * the ticket's sweep. carve-rs `018b0e443` agrees on the colon rows and on the
 * over-indented code rows, and still keeps the run inside a `dd` when the fence
 * is written AT the body's own column - which is a carve-rs defect against the
 * same clause and not a reading this file bends to.
 *
 * NOT DECIDED HERE: the ticket's second row, an INNER item's fence with the run
 * at column 0, which differs in more than the container's reach and has no
 * clause. The guard at the bottom pins the oracle's current answer so this change
 * cannot move it by accident.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

/** The bodies of the two hosts, at the SAME content column 3. */
const item = (lines) => ['-  head', '', ...lines, '', '   tail', ''].join('\n')
const dd = (lines) => [':: t', ':  head', '', ...lines, '', '   tail', ''].join('\n')

/** Everything past the OUTERMOST list's close tag: the residue the run detached. */
const residue = (out) => {
  const close = /<\/(?:ul|dl)>/g
  let end = -1
  for (let m = close.exec(out); m; m = close.exec(out)) end = m.index + m[0].length
  return end < 0 ? out : out.slice(end)
}
/** Did the trailing line stay INSIDE the container? */
const keptTail = (out) => !residue(out).includes('tail')

test('the minimal pair answers alike at equal content columns', () => {
  for (const [label, body] of [
    ['a code fence', ['      ```', '      a', '```']],
    ['a colon fence', ['      :::', '      a', ':::']],
  ]) {
    assert.equal(
      keptTail(html(item(body))),
      keptTail(html(dd(body))),
      `${label}: the two hosts disagreed about the trailing line`,
    )
    assert.equal(
      residue(html(item(body))),
      residue(html(dd(body))),
      `${label}: the two hosts detached different residue`,
    )
  }
})

test('the whole swept band: the description\u2019s reach ends on every one of the 18 rows', () => {
  // The ticket's sweep. A base at 3 is the body's own column; 5 and 7 are
  // over-indented openers, which establish their own authored base. Every row
  // diverged from carve-js before this change and none does after it - measured
  // against carve-js `479383f48` and carve-php `5db15ff9` on 2026-09-28.
  //
  // Asserted on the `dd` alone rather than against the list item, because the
  // ITEM's own answer for a colon closer at column 1 or 2 is to KEEP the trailing
  // line, and all four readers agree with it there. That row is unanimous, so it
  // is not this file's to move; the pair above is the ticket's, and it is the
  // column-zero run where the two hosts have to answer alike.
  for (const [kind, open, close] of [['code', '```', '```'], ['colon', ':::', ':::']]) {
    for (const base of [3, 5, 7]) {
      for (const closer of [0, 1, 2]) {
        const body = [
          `${' '.repeat(base)}${open}`,
          `${' '.repeat(base)}a`,
          `${' '.repeat(closer)}${close}`,
        ]
        assert.equal(
          keptTail(html(dd(body))),
          false,
          `${kind} at base ${base}, closer at ${closer}: the dd kept the trailing line`,
        )
      }
    }
  }
})

test('the ticket reproducer detaches the run and the trailing line from the dd', () => {
  const out = html(':: t\n: head\n\n      ```\n      a\n```\n\n  tail\n')
  assert.equal(
    out,
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>head</p>\n    <pre><code>a\n' +
      '</code></pre>\n  </dd>\n</dl>\n<pre><code>\n  tail\n</code></pre>',
  )
})

test('GUARD: the content column itself is unmoved, which is what makes the pair minimal', () => {
  // The ticket's own control: with no fence in the document, a trailing line at
  // the body's column 3 attaches and one at 2 does not. Both hosts, unchanged.
  assert.ok(html(':: t\n:  head\n\n   tail\n').includes('<dd>'))
  assert.ok(keptTail(html(':: t\n:  head\n\n   tail\n')))
  assert.ok(!keptTail(html(':: t\n:  head\n\n  tail\n')))
})

test('GUARD: a TERMINATED fence in the same geometry keeps its container', () => {
  // CARVE-P0-014's other control. The closer is written inside the body, so the
  // fence is an ordinary block and nothing about the reach question arises.
  for (const host of [item, dd]) {
    for (const [open, close] of [['```', '```'], [':::', ':::']]) {
      const out = html(host([`      ${open}`, '      a', `      ${close}`]))
      assert.ok(keptTail(out), `a terminated fence detached the trailing line:\n${out}`)
    }
  }
})

test('GUARD: `:::note` is an INVALID opener, so it is prose and still folds', () => {
  // §12's opener test rejects a type word with no separator, which makes the line
  // ordinary paragraph text. The refusal added for the colon half is the
  // validating predicate for exactly this reason - the item collector's shape
  // test is not copied. Both readers fold it in this host.
  const out = html(':: t\n:  head\n:::note\n\n   tail\n')
  assert.ok(out.includes(':::note'), `the invalid opener stopped reaching the dd:\n${out}`)
  assert.ok(keptTail(out), out)
})

test('GUARD: a plain line below the column still folds into the dd', () => {
  const out = html(':: t\n:  head\n more\n\n   tail\n')
  assert.ok(out.includes('more'), out)
  assert.ok(keptTail(out), out)
})

test('GUARD: a comment fence in the same geometry is decided by the comment rule', () => {
  // A comment has no body block, so CARVE-P0-013's premise never holds for it and
  // the fence change here may not reach it. This row USED TO pin the reading
  // "`a` is published and both `%%%` lines are not", which is what all four
  // readers gave - and carve#2488 ruled it a leak rather than a reading: §28 pairs
  // the delimiters at any columns, so the `dd` keeps the closer and answers as it
  // answers the same span closed at the opener's base.
  //
  // Pinned against that control rather than against a transcribed string, so this
  // guard keeps testing that the fence change decides nothing here whichever way
  // the comment rule later moves.
  assert.equal(
    html(':: t\n:  head\n\n     %%%\n     a\n%%%\n\n   tail\n'),
    html(':: t\n:  head\n\n     %%%\n     a\n     %%%\n\n   tail\n'),
  )
})

test('GUARD: an unterminated comment fence in a dd opens no span', () => {
  const out = html(':: t\n:  head\n\n     %%%\n     a\n\n   tail\n')
  assert.ok(out.includes('<p>a</p>'), out)
})

test('GUARD: the unarbitrated inner-item row does not move', () => {
  // carve#2486 deliberately did not claim this one: the oracle keeps the run
  // inside the fence body, carve-js closes the fence at `a` and leaves an empty
  // verbatim span in the outer item, and CARVE-P0-013's worked example matches
  // neither exactly. Pinned as it stands so the fix above cannot decide it.
  assert.equal(
    html('- outer\n  - head\n\n    ```\n    a\n```\n'),
    '<ul>\n  <li>outer\n    <ul>\n      <li>head\n        <pre><code>a\n```\n' +
      '</code></pre>\n      </li>\n    </ul>\n  </li>\n</ul>',
  )
})
