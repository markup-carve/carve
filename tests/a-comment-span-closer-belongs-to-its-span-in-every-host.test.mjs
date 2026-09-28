/*
 * A COMMENT SPAN'S CLOSER BELONGS TO ITS SPAN, IN EVERY HOST (carve#2488).
 *
 * carve#2484 settled the principle - no reading of a comment block makes the
 * body visible and the markers invisible - and carve#2487 implemented it for the
 * list-item collector. Three paths it left alone answered otherwise, each by
 * ending its container ON the closer, which leaves the container's own parse
 * with an opener and no closer: §28 makes that one `%%` line comment, so the
 * payload is PUBLISHED and both delimiters are dropped.
 *
 *   - the definition-description collector, at a closer below the body's column;
 *   - the note-body collector, at a closer below column 2. carve#2488 reads this
 *     host as already hiding the payload. It does at a closer REACHING column 2,
 *     which is where carve#2484 swept it, and it did not at column 0 or 1;
 *   - the item collector's column-0 OPENER break, which asked
 *     `commentFenceOpensSpan` of the line alone: with a span open the same line
 *     is its closer, and a second `%%%` below made the lookahead say "opener".
 *
 * ONE PREDICATE, THREE HOSTS. `closesBodyCommentSpan` asks whether the line is
 * the exact-width closer of a span the container's own lines already hold, and
 * every host keeps the delimiter when it is.
 *
 * WHY THIS READING. carve#2484's control is the reading: the same span with its
 * closer at the opener's base hides the payload, and so does the same pair at
 * document level, so the closer's COLUMN is not a parameter. Every row below is
 * asserted against that control rather than against a transcribed string, so a
 * later ruling that moves the control moves the expectation with it.
 *
 * MEASURED 2026-09-28. carve-js at the pinned `c5df77f65` build, carve-php at
 * `9fc5fae`, carve-rs at `3a8403d`, each run on the four reproducers: all three
 * publish the payload in all four, so the oracle is ahead of the fleet here and
 * carve-js#..., carve-php#... and carve-rs#... carry the rows.
 *
 * The guards are most of this file on purpose. The defect is a column boundary
 * and the over-correction - swallowing a payload that is NOT a delimiter, or
 * keeping a container open past a real opener - passes every row above them.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

/*
 * The four hosts, spelled so the closer's column is the only parameter.
 * `closer: null` writes no closer at all, which is §28's unterminated opener.
 */
const hosts = {
  item: ({ opener, closer, tail }) => [
    '- head',
    '',
    `${' '.repeat(opener)}%%%`,
    `${' '.repeat(opener)}PAYLOAD`,
    ...(closer === null ? [] : [`${' '.repeat(closer)}%%%`]),
    ...(tail ? ['', '  tail'] : []),
    '',
  ],
  dd: ({ opener, closer, tail }) => [
    ':: t',
    ':  head',
    '',
    `${' '.repeat(opener)}%%%`,
    `${' '.repeat(opener)}PAYLOAD`,
    ...(closer === null ? [] : [`${' '.repeat(closer)}%%%`]),
    ...(tail ? ['', '   tail'] : []),
    '',
  ],
  footnote: ({ opener, closer, tail }) => [
    'see[^f]',
    '',
    '[^f]: head',
    '',
    `${' '.repeat(opener)}%%%`,
    `${' '.repeat(opener)}PAYLOAD`,
    ...(closer === null ? [] : [`${' '.repeat(closer)}%%%`]),
    ...(tail ? ['', '  tail'] : []),
    '',
  ],
  quote: ({ opener, closer, tail }) => [
    '> - head',
    '>',
    `> ${' '.repeat(opener)}%%%`,
    `> ${' '.repeat(opener)}PAYLOAD`,
    ...(closer === null ? [] : [`> ${' '.repeat(closer)}%%%`]),
    ...(tail ? ['>', '>   tail'] : []),
    '',
  ],
}

/** The column each host's content sits at, and one column above it. */
const columns = { item: 2, dd: 3, footnote: 2, quote: 2 }

const doc = (host, shape) => hosts[host](shape).join('\n')

test('the ticket reproducer publishes no payload and no delimiter', () => {
  const out = html(':: t\n:  head\n\n     %%%\n     a\n%%%\n')
  assert.ok(!out.includes('a<'), `the comment body reached the page:\n${out}`)
  assert.ok(!out.includes('%'), `a delimiter reached the page:\n${out}`)
  assert.equal(out, '<dl>\n  <dt>t</dt>\n  <dd>head</dd>\n</dl>')
})

test('two consecutive spans keep both payloads down when the first closer is at column 0', () => {
  // The second case in carve#2488: the first span's column-0 closer is followed
  // by another `%%%`, so the opener lookahead answered "opener" for a line that
  // was a closer, and the item ended there.
  const control = html('- head\n\n    %%%\n    A\n    %%%\n    %%%\n    B\n    %%%\n\n  tail\n')
  for (const first of ['', '  ', '    ']) {
    for (const second of ['', '  ', '    ']) {
      const out = html(`- head\n\n    %%%\n    A\n${first}%%%\n${second}%%%\n    B\n    %%%\n\n  tail\n`)
      assert.ok(!/(^|\W)[AB](\W|$)/.test(out.replace(/<[^>]*>/g, ' ')), `a payload reached the page:\n${out}`)
      if (first !== '' && second !== '') assert.equal(out, control)
    }
  }
})

test('the closer’s column is not a parameter, in any host', () => {
  // carve#2484's control, generalized: the closer at the opener's own base is
  // the reading, and every column from there down to 0 has to give it.
  for (const host of Object.keys(hosts)) {
    for (const tail of [false, true]) {
      for (const opener of [columns[host] + 1, columns[host] + 3]) {
        const control = html(doc(host, { opener, closer: opener, tail }))
        for (let closer = 0; closer <= opener; closer++) {
          assert.equal(
            html(doc(host, { opener, closer, tail })),
            control,
            `${host}: a closer at column ${closer} read differently from one at column ${opener}`,
          )
        }
      }
    }
  }
})

test('no host publishes the payload of a span that has a closer', () => {
  for (const host of Object.keys(hosts)) {
    for (const tail of [false, true]) {
      for (let opener = columns[host]; opener <= columns[host] + 4; opener++) {
        for (let closer = 0; closer <= opener; closer++) {
          const out = html(doc(host, { opener, closer, tail }))
          assert.ok(
            !out.includes('PAYLOAD'),
            `${host} published the comment body (opener ${opener}, closer ${closer}):\n${out}`,
          )
          assert.ok(!out.includes('%'), `${host} published a delimiter:\n${out}`)
        }
      }
    }
  }
})

test('a span the innermost container holds is closed even where its collector cannot see it', () => {
  // A nested item's span is dedented past the outer collector's own fence
  // tracker, so the outer collector had no open span to consult and ended the
  // OUTER item on the inner span's closer. The predicate reads the collected
  // lines instead, which is where the span is.
  const out = html('- o\n  - head\n\n    %%%\n    A\n%%%\n%%%\n    B\n    %%%\n')
  assert.ok(!/(^|\W)[AB](\W|$)/.test(out.replace(/<[^>]*>/g, ' ')), out)
})

test('GUARD: an unterminated opener still publishes its payload as ordinary text', () => {
  // §28: an opener with no exact-width closer ahead opens NOTHING and is one
  // `%%` line comment, so the payload is the host's own content. Reading it as a
  // hidden body is the opposite over-correction, and it would pass every row
  // above.
  for (const host of Object.keys(hosts)) {
    const out = html(doc(host, { opener: columns[host] + 2, closer: null, tail: false }))
    assert.ok(out.includes('PAYLOAD'), `${host} swallowed an unterminated fence's payload:\n${out}`)
  }
})

test('GUARD: a payload line below the column still ends the container', () => {
  // Only the DELIMITER is exempt. `X` is not comment-shaped, so §24 C3 hands it
  // to the enclosing parse, and all three engines publish it there.
  const rows = [
    ['- head\n\n    %%%\nX\n%%%\n\n  tail\n', '</ul>'],
    [':: t\n:  head\n\n     %%%\nX\n%%%\n\n   tail\n', '</dl>'],
  ]
  for (const [src, end] of rows) {
    const out = html(src)
    assert.ok(out.includes('<p>X</p>'), `X stopped reaching document level:\n${out}`)
    assert.ok(!out.slice(0, out.indexOf(end)).includes('X'), `X was consumed into the container:\n${out}`)
  }
})

test('GUARD: a comment OPENER below the column still ends the container', () => {
  // The span this fix keeps is one the container already HOLDS. An opener below
  // the column opens nothing there - carve#1930 for the `dd`, carve#618/#629 for
  // the item - and the container ends at it exactly as before.
  assert.equal(
    html(':: t\n:  head\n\n%%%\na\n%%%\n\nafter\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>head</dd>\n</dl>\n<p>after</p>',
  )
  assert.equal(
    html('- head\n\n%%%\na\n%%%\n\n  tail\n'),
    '<ul>\n  <li>head</li>\n</ul>\n<p>tail</p>',
  )
})

test('GUARD: a `%%` line below the column is unmoved in every host', () => {
  // carve#618's rule, the one the fence form was brought into line with. It is
  // not a fence, so it opens and closes nothing and no span can be open at it.
  assert.equal(html(':: t\n:  head\n%%\n'), '<dl>\n  <dt>t</dt>\n  <dd>head</dd>\n</dl>')
  assert.equal(html('- head\n%% c\ntail\n'), '<ul>\n  <li>head\n    tail\n  </li>\n</ul>')
})

test('GUARD: a code fence and a colon fence in the same geometry are untouched', () => {
  // CARVE-P0-013 and CARVE-P0-014 govern both, and the exemption is about a
  // construct with no body BLOCK - so neither of these may move.
  const code = '```'
  assert.equal(
    html(`- head\n\n    ${code}\n    HIDDEN\n${code}\n\n  tail\n`),
    `<ul>\n  <li>head\n    <pre><code>HIDDEN\n</code></pre>\n  </li>\n</ul>\n<pre><code>\n  tail\n</code></pre>`,
  )
  assert.equal(
    html(':: t\n:  head\n\n     :::\n     HIDDEN\n:::\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>head</p>\n    <div>\n      <p>HIDDEN</p>\n    </div>\n  </dd>\n</dl>\n<div>\n\n</div>',
  )
})

test('GUARD: a `%%%` inside a code fence is that fence’s content, not an opener', () => {
  // The predicate walks the collected lines, so it has to step over an opaque
  // payload the way every other walk does - otherwise a `%%%` written inside a
  // code block leaves a phantom span open and the next column-0 delimiter is
  // kept for it.
  assert.equal(
    html(':: t\n:  head\n\n     ```\n     %%%\n     a\n     ```\n'),
    '<dl>\n  <dt>t</dt>\n  <dd>\n    <p>head</p>\n    <pre><code>%%%\na\n</code></pre>\n  </dd>\n</dl>',
  )
  assert.ok(html('- head\n\n    ```\n    %%%\n    a\n    ```\n\n  tail\n').includes('%%%'))
})

test('GUARD: a run of a different width is fence content, not the closer', () => {
  // §28 closes on an EXACT-width run. A `%%%%` line inside a `%%%` span is
  // payload wherever it is written, so the span runs on and nothing below it is
  // published.
  const out = html(':: t\n:  head\n\n     %%%\n     a\n%%%%\n     b\n%%%\n')
  assert.ok(!out.includes('a<') && !out.includes('b<'), out)
  assert.ok(!out.includes('%'), out)
})
