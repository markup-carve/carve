/*
 * PART 12 §3a, enforced: a link or image that CAME FROM A REFERENCE keeps the
 * label the author wrote, in `ref` and `rawRef`, beside the resolved `href`.
 *
 * Nothing checked this. The schema names both fields and marks both optional -
 * it must, because a direct `[text](/url)` link has no reference to record - so
 * an engine that resolves a reference and then throws the label away validates
 * cleanly. All three engines did exactly that at some point, and the only
 * record of it was a prose table in docs/ast-json.md, which was wrong in both
 * directions inside two months (carve#673, carve#674).
 *
 * The rule needs the SOURCE, not just the tree: only the span a node came from
 * says whether it was written as a reference. These cases drive that rule
 * directly, so a regression fails here rather than being noticed, or not, the
 * next time somebody re-measures the documentation.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { checkReferenceFields } from '../scripts/spec/ast-references.mjs'

/** The whole of a one-line source, as PART 12 §4 spells a span. */
function span(source) {
  return {
    startLine: 1,
    endLine: 1,
    startColumn: 1,
    endColumn: source.length + 1,
    startOffset: 0,
    endOffset: source.length,
  }
}

/** A link node spanning the whole of a one-line source. */
function linkOver(source, fields) {
  return {
    type: 'document',
    children: [
      {
        type: 'paragraph',
        pos: span(source),
        children: [
          {
            type: 'link',
            pos: span(source),
            children: [{ type: 'text', value: 'x' }],
            ...fields,
          },
        ],
      },
    ],
  }
}

function findings(source, fields, type = 'link') {
  const doc = linkOver(source, fields)
  doc.children[0].children[0].type = type
  const out = []
  checkReferenceFields(doc, source, out)
  return out
}

test('a resolved full reference keeps ref and rawRef', () => {
  assert.deepEqual(
    findings('[x][label]', { href: '/start', ref: 'label', rawRef: '[x][label]' }),
    [],
  )
})

test('a full reference that publishes href alone is reported', () => {
  const out = findings('[x][label]', { href: '/start' })
  assert.equal(out.length, 1)
  assert.match(out[0], /reference/)
  assert.match(out[0], /ref/)
  assert.match(out[0], /3a/)
})

test('a collapsed reference that publishes href alone is reported', () => {
  assert.equal(findings('[x][]', { href: '/start' }).length, 1)
})

/*
 * Carve HAS NO SHORTCUT REFERENCE. PART 9 §14: the character after the closing
 * bracket selects the construct, and anything but `(`, `[` or `{` leaves the
 * brackets literal. A checker that demanded `ref` for a bare `[label]` would be
 * enforcing a construct the language does not have.
 */
test('a bare [label] is not a reference - Carve has no shortcut form', () => {
  assert.deepEqual(findings('[x]', { href: '/start' }), [])
})

test('half a pair is reported - ref without rawRef', () => {
  const out = findings('[x][label]', { href: '/start', ref: 'label' })
  assert.equal(out.length, 1)
  assert.match(out[0], /rawRef/)
})

test('half a pair is reported - rawRef without ref', () => {
  const out = findings('[x][label]', { href: '/start', rawRef: '[x][label]' })
  assert.equal(out.length, 1)
  assert.match(out[0], /\bref\b/)
})

/*
 * TRAILING ATTRIBUTES are part of the span. `[intro][x]{.ext}` is a reference
 * with a class on it, and a classifier that only looks at the last character
 * calls it neither form and says nothing - which is where three of the corpus's
 * own reference links sat when this check first ran over it.
 */
test('a full reference with trailing attributes is still a reference', () => {
  assert.equal(findings('[x][label]{.ext}', { href: '/start' }).length, 1)
})

test('a collapsed reference with trailing attributes is still a reference', () => {
  assert.equal(findings('[x][]{.ext}', { href: '/start' }).length, 1)
})

test('an attributed bracket run is an inline span, not a reference', () => {
  assert.deepEqual(findings('[x]{#a .b}', { href: '/start' }), [])
})

test('an attributed reference that carries its label is clean', () => {
  assert.deepEqual(
    findings('[x][label]{.ext}', { href: '/s', ref: 'label', rawRef: '[x][label]{.ext}' }),
    [],
  )
})

test('an attributed inline link is still not a reference', () => {
  assert.deepEqual(findings('[x](/url){.ext}', { href: '/url' }), [])
})

/*
 * The negative half. A rule that fires on every link would pass the cases above
 * while saying nothing true, so these pin what it must NOT claim.
 */
test('an inline link is not a reference and needs neither field', () => {
  assert.deepEqual(findings('[x](/url)', { href: '/url' }), [])
})

test('an inline link with a title is not a reference', () => {
  assert.deepEqual(findings('[x](/url "t")', { href: '/url', title: 't' }), [])
})

test('an image reference is held to the same rule', () => {
  const out = findings('![x][label]', { src: '/i.png', alt: 'x' }, 'image')
  assert.equal(out.length, 1)
  assert.match(out[0], /image/)
})

test('an inline image is not a reference', () => {
  assert.deepEqual(findings('![x](/i.png)', { src: '/i.png', alt: 'x' }, 'image'), [])
})

/*
 * An UNRESOLVED reference is still a reference: §3a says `href` is empty only
 * where nothing resolved it, and the label the author wrote survives either way.
 */
test('an unresolved reference still has to carry its label', () => {
  assert.equal(findings('[x][missing]', { href: '' }).length, 1)
  assert.deepEqual(findings('[x][missing]', { href: '', ref: 'missing', rawRef: '[x][missing]' }), [])
})

/*
 * A node whose span the source does not support says nothing about references -
 * that is checkPositions' finding to make, and duplicating it here would turn
 * one defect into two reports.
 */
test('a span the source cannot supply is left to the position check', () => {
  assert.deepEqual(findings('[x](/url)', { href: '/url', pos: null }), [])
})

test('a multi-line span is read across the lines it covers', () => {
  const source = 'see [the\nlabel][ref] here'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'paragraph',
        pos: { startLine: 1, endLine: 2, startColumn: 1, endColumn: 25 },
        children: [
          {
            type: 'link',
            pos: { startLine: 1, endLine: 2, startColumn: 5, endColumn: 12, startOffset: 4, endOffset: 20 },
            href: '/x',
            children: [{ type: 'text', value: 'the label' }],
          },
        ],
      },
    ],
  }
  const out = []
  checkReferenceFields(doc, source, out)
  assert.equal(out.length, 1)
})
