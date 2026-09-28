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
