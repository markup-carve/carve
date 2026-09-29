/*
 * PART 0 owner selection gives an unmarked line to the owner of the preceding
 * ORDINARY line, and CARVE-P0-006 names a closed fence among the boundaries
 * that store no claim. A fence opener and a line inside an open fence are not
 * ordinary lines either.
 *
 * The oracle asked the quote's own tracker instead, and that tracker knew two
 * things less than the block reader beside it: it had no fence state below the
 * outermost level, so `opensParagraph` read a nested fence opener as paragraph
 * text; and it stood in for SS10 I4 with "was the previous line blank", which
 * admits neither a fence under a heading, a break, a table or a closed fence,
 * nor one under a paragraph with a closer below it (carve#2513).
 *
 * The corpus pins seven of these shapes. This file carries the ones that vary a
 * dimension the corpus does not - depth 3, the tilde spelling, the unmarked
 * line's column - and the cost guard, because an index built per opener rather
 * than per depth is the rescan carve#2509 ruled out.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDoc } from '../scripts/spec/html.mjs'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

const F = '`'.repeat(3)

const shape = (node) => {
  if (Array.isArray(node)) return node.map(shape).join(', ')
  if (node.t === 'para') return `p(${(node.lines ?? []).join('|')})`
  const kids = node.children ?? node.blocks
  return Array.isArray(kids) ? `${node.t}[${kids.map(shape).join(', ')}]` : node.t
}
const blocks = (src) => shape(parse(src).blocks)

test('a fence in a quote leaves the unmarked line outside every quote', () => {
  for (const [name, src, want] of [
    ['closed fence under a quoted paragraph',
      `> a\n> ${F}\n> c\n> ${F}\ny\n`, 'quote[p(a), code], p(y)'],
    ['one level down',
      `> > a\n> > ${F}\n> > c\n> > ${F}\ny\n`, 'quote[quote[p(a), code]], p(y)'],
    ['two levels down',
      `> > > a\n> > > ${F}\n> > > c\n> > > ${F}\ny\n`, 'quote[quote[quote[p(a), code]]], p(y)'],
    ['tilde spelling',
      `> > a\n> > ~~~\n> > c\n> > ~~~\ny\n`, 'quote[quote[p(a), code]], p(y)'],
    ['an unterminated nested fence at block start',
      `> > ${F}\nc\n`, 'quote[quote[code]], p(c)'],
    ['a line inside an open nested fence',
      `> > ${F}\n> > x\ny\n`, 'quote[quote[code]], p(y)'],
    ['a closed fence under a quoted heading',
      `> # H\n> ${F}\n> c\n> ${F}\ny\n`, 'quote[heading, code], p(y)'],
    ['a closed fence under a quoted table',
      `> | c |\n> ${F}\n> c\n> ${F}\ny\n`, 'quote[table, code], p(y)'],
    ['a nested fence under an outer paragraph',
      `> a\n> > ${F}\n> > c\n> > ${F}\ny\n`, 'quote[p(a), quote[code]], p(y)'],
    // The unmarked line's COLUMN is not a parameter: a quote is reached by its
    // marker and a column never reaches into one (SS10 I5).
    ['the unmarked line at column 1',
      `> > ${F}\n> > c\n> > ${F}\n y\n`, 'quote[quote[code]], p(y)'],
    ['the unmarked line at column 2',
      `> > ${F}\n> > c\n> > ${F}\n  y\n`, 'quote[quote[code]], p(y)'],
  ]) assert.equal(blocks(src), want, name)
})

test('an ordinary quoted line after the fence stores the claim again', () => {
  // The other side of the rule, and the leave-one-out control for it: nothing
  // about a fence ends the quote for a line that DOES follow ordinary text.
  assert.equal(blocks(`> > ${F}\n> > c\n> > ${F}\n> > b\ny\n`),
    'quote[quote[code, p(b|y)]]')
  assert.equal(blocks(`> > a\n> > ${F}\n> > c\n> > ${F}\n> b\ny\n`),
    'quote[quote[p(a), code], p(b|y)]')
})

test('a fence with no closer under a quoted paragraph is paragraph text', () => {
  // SS10 I4's other arm, which is what makes the closer lookahead load-bearing
  // rather than a formality: read as an unconditional opener, these fold nothing.
  assert.equal(blocks(`> a\n> ${F}\n> c\ny\n`), `quote[p(a|${F}|c|y)]`)
  assert.equal(blocks(`> > a\n> > ${F}\n> > c\ny\n`), `quote[quote[p(a|${F}|c|y)]]`)
})

test('the closer lookahead is built per depth, not per opener', () => {
  // COUNTED, for the reasons tests/nested-container-rescan.test.mjs records: a
  // wall-clock ceiling passes on a fast enough machine and a ratio flakes.
  //
  // A body of fenced bodies under a quoted paragraph. Every opener sits under
  // an open paragraph, so every one of them asks the lookahead.
  const shapes = {
    // Closed pairs: every opener finds its closer on the next row.
    'closed fenced bodies': (d, n) => {
      const p = '> '.repeat(d)
      const body = [p + 'a']
      for (let k = 0; k < n; k++) body.push(p + F, p + 'c', p + F)
      return body.join('\n') + '\ny\n'
    },
    // Openers that match NOTHING, over a run of pure closers of the OTHER fence
    // character. Every query fails, which the closed shape never exercises, and
    // a search over the index rather than a per-character lookup reads 61.66
    // lookahead lines per byte here at n=800 against 15.50 at n=200 (raised by
    // codex review).
    'openers no closer can match': (d, n) => {
      const p = '> '.repeat(d)
      return [p + 'a', ...Array.from({ length: n }, () => p + F + 'x'),
        ...Array.from({ length: n }, () => p + '~~~')].join('\n') + '\ny\n'
    },
  }
  const perByte = (src) => {
    resetLayoutWork()
    parse(src)
    return layoutWork.fenceCloserLookahead / src.length
  }
  for (const [name, gen] of Object.entries(shapes)) {
    for (const d of [1, 2]) {
      const small = perByte(gen(d, 50))
      const large = perByte(gen(d, 400))
      assert.ok(small > 0, `${name}: the lookahead counter is not counting at depth ${d}`)
      assert.ok(
        large / small <= 1.3,
        `${name}: lookahead work per byte climbed ${(large / small).toFixed(2)}x from 50 to 400 ` +
        `at depth ${d} (${small.toFixed(3)} -> ${large.toFixed(3)}): the index is being ` +
        `rebuilt per opener, or searched rather than read`,
      )
      assert.ok(large <= 1, `${name}: ${large.toFixed(3)} lookahead lines per byte at depth ${d}, ceiling 1`)
    }
  }
})

test('a nested fence past the nesting cap is literal paragraph text', () => {
  // SS25 degrades an opener past MAX_NESTING_DEPTH, so the tracker may not treat
  // one as an open payload where the block reader reads prose. The pair is the
  // control: one marker less and the fence opens, so the unmarked line leaves.
  const src = (d) => '> '.repeat(d) + F + '\ny\n'
  const leaf = (d) => {
    let blocks = parse(src(d)).blocks
    while (blocks[0]?.t === 'quote') blocks = blocks[0].children ?? blocks[0].blocks
    return { top: parse(src(d)).blocks.map((b) => b.t), leaf: shape(blocks) }
  }
  assert.deepEqual(leaf(200), { top: ['quote'], leaf: `p(${F}|y)` })
  assert.deepEqual(leaf(199), { top: ['quote', 'para'], leaf: 'code' })
})

test('unmatched quoted openers do not rescan incompatible closer candidates', () => {
  for (const depth of [1, 2, 4]) for (const closer of ['~~~', '```']) {
    const measure = count => {
      const prefix = '> '.repeat(depth)
      const source = prefix + 'a\n' + (prefix + '````` x\n').repeat(count) +
        (prefix + closer + '\n').repeat(count) + 'tail\n'
      resetLayoutWork()
      parse(source)
      return layoutWork.fenceCloserLookahead
    }
    const small = measure(40), large = measure(160)
    assert.ok(small > 40)
    assert.ok(large / small < 4.3, `${depth}, ${closer}: ${small} -> ${large}`)
  }
})

/*
 * AND NO HOST TERM (carve#2538). A fence a list item, a description body or a
 * footnote body inside the quote holds open is written at that container's
 * content column, and the tracker read column 0 only - so the opener, its
 * payload and its closer read as ordinary text and the unmarked line kept a
 * claim whose owner varied with depth. Corpus 513 pins the shapes; this file
 * carries the dimensions it does not vary, and the cost of the column-keyed
 * closer index.
 */
const deep = (node) => {
  if (Array.isArray(node)) return node.map(deep).join(', ')
  if (node.t === 'para') return `p(${(node.lines ?? []).join('|')})`
  if (node.t === 'list') return `list[${node.items.map((it) => `item[${it.blocks.map(deep).join(', ')}]`).join(', ')}]`
  const kids = node.children ?? node.blocks
  return Array.isArray(kids) ? `${node.t}[${kids.map(deep).join(', ')}]` : node.t
}
const host = (src) => deep(parse(src).blocks)
const T = '~'.repeat(3)

test('a fence a container inside a quote holds open leaves the unmarked line outside', () => {
  for (const [name, src, want] of [
    ['tilde at depth 1', `> - a\n>\n>   ${T}\n>   x\nflush\n`,
      'quote[list[item[p(a), code]]], p(flush)'],
    // DEPTH 3 LIVES HERE RATHER THAN IN THE CORPUS. The pinned reference build
    // measures a lazily folded line inside a quoted nested item against a
    // re-indented source, so its offsets run past the end of a depth-3 document
    // and the AST position gate reports that instead of this rule. The defect is
    // older than the rule: `> - a` / `>   - b` / `y` already carries it.
    ['depth 3', `> - a\n>   - b\n>     - c\n>\n>       ${F}\n>       x\nflush\n`,
      'quote[list[item[p(a), list[item[p(b), list[item[p(c), code]]]]]]], p(flush)'],
    ['tilde closed at depth 3', `> - a\n>   - b\n>     - c\n>\n>       ${T}\n>       x\n>       ${T}\nflush\n`,
      'quote[list[item[p(a), list[item[p(b), list[item[p(c), code]]]]]]], p(flush)'],
    ['an info string', `> - a\n>\n>   ${F}js\n>   x\nflush\n`,
      'quote[list[item[p(a), code]]], p(flush)'],
    // The closer is written at or outside the opener's own column. A pure run
    // further in is payload, so the fence is still open over `z`.
    ['a pure run further in than the opener is payload',
      `> - a\n>\n>   ${F}\n>   x\n>     ${F}\n>\n>   z\nflush\n`,
      'quote[list[item[p(a), code]]], p(flush)'],
  ]) assert.equal(host(src), want, name)
})

test('the column gate is what decides it, and it can refuse', () => {
  // BELOW the content column the run is no fence: it ends the item and is the
  // QUOTE's own paragraph, which stores the claim the fence would have denied.
  // Without this control the clause above would pass on a tracker that read
  // every indented run as a fence.
  assert.equal(host(`> - a\n>\n>  ${F}\n>  x\nflush\n`),
    `quote[list[item[p(a)]], p(${F}|x|flush)]`)
  // And the quote's OWN level stays strict at column 0 (§10 I1 spelling aside,
  // this is the `- a` control with no container to reach).
  assert.equal(host(`> a\n>\n>   ${F}\n>   x\nflush\n`),
    `quote[p(a), p(${F}|x|flush)]`)
})

test('§10 I4 is asked at the container column too', () => {
  // Under the item's OWN open paragraph the fence needs a closer. Without one it
  // is paragraph text and the unmarked line folds; with one the item holds a
  // code block and the line leaves.
  assert.equal(host(`> - a\n>   ${F}\n>   x\nflush\n`),
    `quote[list[item[p(a|${F}|x|flush)]]]`)
  assert.equal(host(`> - a\n>   ${F}\n>   x\n>   ${F}\nflush\n`),
    'quote[list[item[p(a), code]]], p(flush)')
})

test('a container-held closer index is read, not searched', () => {
  // The index carries one bucket per fence character AND per column, so an
  // opener at an item's content column cannot walk rows that belong to another
  // column. #2509's rescan and #2517's search are the two shapes this bounds.
  const shapes = {
    'item-held openers over tilde closers': (n) => '> - a\n' +
      Array.from({ length: n }, () => `>   ${F}${F} x`).join('\n') + '\n' +
      Array.from({ length: n }, () => `>   ${T}`).join('\n') + '\ntail\n',
    'item-held openers over matching closers': (n) => '> - a\n' +
      Array.from({ length: n }, () => `>   ${F}${F} x`).join('\n') + '\n' +
      Array.from({ length: n }, () => `>   ${F}${F}`).join('\n') + '\ntail\n',
    'shifted item-held openers over tilde closers': (n) => '> - a\n' +
      Array.from({ length: n }, () => `>     ${F}${F} x`).join('\n') + '\n' +
      Array.from({ length: n }, () => `>     ${T}`).join('\n') + '\ntail\n',
    // And one quote deeper, where the index is keyed by marker count as well.
    'nested item-held openers over tilde closers': (n) => '> > - a\n' +
      Array.from({ length: n }, () => `> >   ${F}${F} x`).join('\n') + '\n' +
      Array.from({ length: n }, () => `> >   ${T}`).join('\n') + '\ntail\n',
  }
  const perByte = (src) => {
    resetLayoutWork()
    parse(src)
    return layoutWork.fenceCloserLookahead / src.length
  }
  for (const [name, gen] of Object.entries(shapes)) {
    const small = perByte(gen(50))
    const large = perByte(gen(800))
    assert.ok(small > 0, `${name}: the lookahead counter is not counting`)
    assert.ok(large / small <= 1.3,
      `${name}: lookahead work per byte climbed ${(large / small).toFixed(3)}x from 50 to 800 ` +
      `(${small.toFixed(3)} -> ${large.toFixed(3)}): the index is rebuilt per opener or searched`)
    assert.ok(large <= 1, `${name}: ${large.toFixed(3)} lookahead lines per byte, ceiling 1`)
  }
})

test('a container this line opened puts the fence at its block start', () => {
  // A SIBLING item's marker-line fence is the second item's first block, and the
  // quote's paragraph state there is the FIRST item's. Read as a fence under an
  // open paragraph it was held to needing a closer, and the unmarked line stayed
  // its payload (raised in review of carve#2538).
  assert.equal(host(`> - a\n> - ${F}\n>   x\nflush\n`),
    'quote[list[item[p(a)], item[code]]], p(flush)')
  assert.equal(host(`> - a\n>   - ${F}\n>     x\nflush\n`),
    'quote[list[item[p(a), list[item[code]]]]], p(flush)')
  // AND A MARKER THAT OPENS NOTHING DOES NOT. PART 9 §17: a list marker does not
  // interrupt a paragraph, so with no list open the same line is paragraph text
  // and the run below it is too. These are the controls that make the clause
  // above a rule rather than a blanket.
  assert.equal(host(`> a\n> - ${F}\n>   x\nflush\n`),
    `quote[p(a|- ${F}|x|flush)]`)
  // The paragraph collector strips the continuation line's indentation, so the
  // indented spelling reads back at column 0 - one paragraph either way.
  assert.equal(host(`> a\n>   - ${F}\n>     x\nflush\n`),
    `quote[p(a|- ${F}|x|flush)]`)
})

test('refused fence runs stay paragraph text at shifted columns', () => {
  assert.equal(host(`> - a\n>     ${F}\n>\n>    ${F}\n>   a\nflush\n`),
    `quote[list[item[p(a|${F}), p(${F}|a|flush)]]]`)
  assert.equal(host(`> - a\n>   ${F}\n>   x\n>     ${F}\n>   a\nflush\n`),
    `quote[list[item[p(a|${F}|x|${F}|a|flush)]]]`)
  assert.equal(host(`> - a\n>\n>     ${F}\n>     x\nflush\n`),
    'quote[list[item[p(a), code]]], p(flush)')
  // A LINE WITH AN INVALID INFO STRING IS NOT A FENCE LINE AT ALL: it is prose
  // holding an inline verbatim run, so it leaves no closer to come and the opener
  // below it is real (raised by codex review).
  const BAD = F + 'bad' + '`'
  assert.equal(host(`> - a\n>   ${BAD}\n>\n>   ${F}\n>   x\nflush\n`),
    `quote[list[item[p(a|${BAD}), code]]], p(flush)`)
  assert.equal(host(`> ${BAD}\n> # H\n> ${F}\n> x\nflush\n`),
    `quote[p(${BAD}), heading, code], p(flush)`)
})

test('a host that ends ends its fence, and the line is classified again', () => {
  // `> after` leaves the item, so the payload ends with the item and the quote's
  // own paragraph opens there - storing the claim the fence had denied. Only a
  // matching closer used to clear the tracker's fence state, so the ordinary line
  // read as payload and the unmarked line left a quote that still held it
  // (raised in review of carve#2538).
  assert.equal(host(`> - a\n>\n>   ${F}\n>   x\n> after\nflush\n`),
    'quote[list[item[p(a), code]], p(after|flush)]')
  // A BLANK IS INTERIOR TO THE PAYLOAD and ends no host, which is the control:
  // the fence is still open over the blank and the line below it.
  assert.equal(host(`> - a\n>\n>   ${F}\n>   x\n>\n>   y\nflush\n`),
    'quote[list[item[p(a), code]]], p(flush)')
})

test('a description body is not a host, in either spelling', () => {
  // Its column would put a fence out of the quote's sight too, but whether a
  // `: ` line opens a body depends on the term's list still being open - and
  // that list ends at a blank followed by anything, at a block opener and at an
  // indented list written before any description, while surviving text that
  // folds into the term. Guessing at it read three shapes wrong, so the host is
  // out and these pin its absence against the block reader's own answers.
  assert.equal(host(`> :  a\n>\n>    ${F}\n>    x\nflush\n`),
    `quote[p(:  a), p(${F}|x|flush)]`)
  assert.equal(host(`> :: t\n> :  d\n>\n>    ${F}\n>    x\nflush\n`),
    'quote[deflist, p(flush)]')
  assert.equal(host(`> :: t\n>   - a\n> : d\n>\n>   ${F}\nflush\n`),
    `quote[deflist, list[item[p(a|: d)]], p(${F}|flush)]`)
})

test('the rule answers the same at every quote depth', () => {
  // CARVE-P0-013 names no depth. The nested path recognized a fence at column 0
  // only, so a container-held one kept the line in the outer quote one level down
  // (raised in review of carve#2538).
  for (const depth of [1, 2, 3]) {
    const p = '> '.repeat(depth)
    const q = (inner) => Array.from({ length: depth }, (_, k) => 'quote['.repeat(1)).join('') + inner + ']'.repeat(depth)
    assert.equal(host(`${p}- a\n${'>'.repeat(depth).split('').join(' ')}\n${p}  ${F}\n${p}  x\nflush\n`),
      `${q('list[item[p(a), code]]')}, p(flush)`, `depth ${depth}`)
    assert.equal(host(`${p}- ${F}\n${p}  x\nflush\n`),
      `${q('list[item[code]]')}, p(flush)`, `marker-line fence at depth ${depth}`)
  }
})

test('only a list item\'s paragraph gives way to a marker', () => {
  // Measured on the block reader: at a DESCRIPTION or FOOTNOTE body's column,
  // under that body's own open paragraph, `- ``` ` is ordinary text and the run
  // under it opens nothing - both bodies take the list only after a blank, while
  // an ITEM's paragraph yields to a marker at its content column. Reading the
  // licence off the ladder's depth rather than its innermost kind moved a quoted
  // line out of a `dd` that keeps it (raised by codex review).
  assert.equal(host(`> :: t\n> :  d\n>    - ${F}\n>      x\nflush\n`),
    `quote[deflist]`)
  assert.equal(host(`> [^f]: d\n>   - ${F}\n>     x\nflush\n`),
    'quote[], p(flush)')
  // An ITEM's paragraph does give way, which is the other direction and what
  // keeps the clause above two-sided.
  assert.equal(host(`> - d\n>   - ${F}\n>     x\nflush\n`),
    'quote[list[item[p(d), list[item[code]]]]], p(flush)')
})

test('an over-indented run inside a container leaves a closer, not an opener', () => {
  // §24 C3 reads "at or past", so the host's own reader takes the column-5 run
  // and the run at the host's column below it is that fence's CLOSER. Untracked,
  // that closer read as a fresh opener and the line under it left a quote that
  // keeps it (raised by codex review).
  assert.equal(host(`> - a\n>     ${F}\n>\n>   ${F}\n>   a\nflush\n`),
    'quote[list[item[p(a), code, p(a|flush)]]]')
  // AND TWO OVER-INDENTED RUNS PAIR WITH EACH OTHER, so the second closes the
  // expectation rather than replacing it. Overwriting left a closer nothing waited
  // for, and it suppressed the real opener below (raised by codex review).
  assert.equal(host(`> - a\n>     ${T}\n>     ${T}\n>\n>   ${T}\n>   x\nflush\n`),
    'quote[list[item[p(a), code, code]]], p(flush)')
  // AT THE LEVEL'S OWN COLUMN THERE IS NOTHING TO REMEMBER: column 0 is strict,
  // so a run further in opened nothing and the run at 0 below it is a real
  // opener. Holding a closer for it suppressed that opener.
  assert.equal(host(`>   ${T}\n> # H\n> ${T}\n> x\nflush\n`),
    `quote[p(${T}), heading, code], p(flush)`)
})

test('the nesting cap counts the host containers too', () => {
  // Past MAX_NESTING_DEPTH an opener degrades to literal paragraph text, so a
  // fence recognized here would open a block the block reader does not. The cap
  // counted quote depth only, and a list item inside the quote is one more
  // container (raised by codex review). The pair is the control: one marker less
  // and the fence really opens.
  const blocks = (d) => parse('> '.repeat(d) + '- ' + T + '\nflush\n').blocks.length
  assert.equal(blocks(199), 1)
  assert.equal(blocks(198), 2)
})

test('shifted code and raw fences release unmarked lines at every quote depth', () => {
  for (const depth of [1, 2, 3]) {
    const q = '> '.repeat(depth)
    const pad = '  '.repeat(depth)
    for (const opener of [F, T, F + '=html', T + '=html']) {
      for (const column of [2, 3, 4, 6]) {
        const spaces = ' '.repeat(column)
        const prefix = `${q}- a\n${q}\n${q}${spaces}${opener}\n${q}${spaces}x\n`
        const payload = opener.endsWith('=html') ? 'x\n' : '<pre><code>x\n</code></pre>\n'
        let expected = ''
        for (let i = 0; i < depth; i++) expected += '  '.repeat(i) + '<blockquote>\n'
        expected += `${pad}<ul>\n${pad}  <li>a\n${pad}    ${payload}${pad}  </li>\n${pad}</ul>\n`
        for (let i = depth - 1; i >= 0; i--) expected += '  '.repeat(i) + '</blockquote>\n'
        expected += '<p>flush</p>'
        for (const closer of ['', `${q}${spaces}${opener.slice(0, 3)}\n`]) {
          const source = prefix + closer + 'flush\n'
          assert.equal(renderDoc(parse(source)), expected, source)
          const tail = `${q}${spaces}b\n${q}${spaces}${opener.slice(0, 3)}\n`
          assert.equal(renderDoc(parse(source + tail)), expected + '\n' + renderDoc(parse(tail)), source + tail)
        }
      }
    }
  }
})

test('intermediate and deeper fence runs stay opaque to quote ownership', () => {
  for (const opener of [F, T, F + '=html', T + '=html']) {
    for (const col of [3, 5]) {
      const source = `> - a\n>\n>     ${opener}\n>     x\n> ${' '.repeat(col)}${opener.slice(0, 3)}\n>   after\nflush\n`
      assert.equal(parse(source).blocks.at(-1).t, 'para', source)
      assert.equal(renderDoc(parse(source)).split('\n').at(-1), '<p>flush</p>', source)
    }
  }
})


test('a refused run at the content column keeps a shifted pair in the paragraph', () => {
  for (const depth of [1, 2, 3]) {
    const q = '> '.repeat(depth)
    for (const lead of ['- a', '- a\n- a']) {
      const body = `${lead}\n  ${T}\n   ${F}\n   y\n   ${F}\n`
      const source = body.trimEnd().split('\n').map(line => q + line).join('\n') + '\nflush\n'
      assert.notEqual(parse(source).blocks.at(-1).t, 'para', source)
      assert.match(renderDoc(parse(source)), /flush<\/li>/, source)
    }
  }
})

test('a shifted opener under a paragraph can close at the host column', () => {
  for (const depth of [1, 2, 3]) {
    const q = '> '.repeat(depth)
    for (const opener of [F, T, F + '=html', T + '=html']) {
      for (const column of [3, 4, 6]) {
        const pad = ' '.repeat(column)
        const source = `${q}- a\n${q}${pad}${opener}\n${q}${pad}x\n${q}  ${opener.slice(0, 3)}\nflush\n`
        assert.equal(renderDoc(parse(source)).split('\n').at(-1), '<p>flush</p>', source)
      }
    }
  }
})

test('a lazy sublist line retains its host column for the next fence', () => {
  for (const depth of [1, 2, 3]) {
    const q = '> '.repeat(depth)
    for (const lead of ['', `  ${F}\n  ${F}\n`]) {
      const body = `- a\n${lead}  - c\n  b\n    ${T}\n  ${T}\n`
      const source = body.trimEnd().split('\n').map(line => q + line).join('\n') + '\nflush\n'
      assert.notEqual(parse(source).blocks.at(-1).t, 'para', source)
      assert.match(renderDoc(parse(source)), /flush<\/li>/, source)
    }
  }
})


test('lazy host tracking preserves the surrounding host controls', () => {
  const cases = [
    [`- a\n  - c\nb\n    ${F}\n    y\n    ${F}\n`, false],
    // The blank-separated case already releases the line before this correction.
    [`- a\n  - c\n  b\n\n    ${T}\n    y\n    ${T}\n`, true],
    [`- a\n  - c\n::: \n    ${T}\n  ${T}\n`, false],
    [`[^n]: a\n  - c\n  b\n    ${T}\n  ${T}\n`, true],
  ]
  for (const depth of [1, 2, 3]) {
    const q = '> '.repeat(depth)
    for (const [body, released] of cases) {
      const source = body.trimEnd().split('\n').map(line => (q + line).trimEnd()).join('\n') + '\nflush\n'
      const last = parse(source).blocks.at(-1)
      assert.equal(last.t === 'para' && last.lines.join('') === 'flush', released, source)
    }
  }
})
