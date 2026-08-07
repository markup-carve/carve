/*
 * A `+`-attached block ends at its fence closer, not at a blank line inside it.
 *
 * §17 L3 names the block kinds a continuation marker may attach - "ONE block of
 * ANY kind (paragraph, list, fenced code, table, block quote, div, ...)" - and
 * bounds the attachment "up to the next blank line, sibling marker, or a further
 * `+`". Those bound THE BLOCK. A fenced block ends at its closer, which is what
 * makes it one block, so a boundary line written between an opener and its
 * closer is fence CONTENT and ends nothing. Reading the blank line as reaching
 * INSIDE the fence would make "fenced code" unattachable the moment its body
 * held a blank, which is the one kind L3 goes out of its way to name.
 *
 * The oracle had two extent helpers for that one block and only one of them
 * consulted any fence state, so the same document answered differently
 * depending on which container held it: a footnote body kept the fence whole
 * while a list item severed it, leaving an unterminated fence at document level.
 * Neither helper knew a COLON fence or a COMMENT fence, so those severed in
 * every container including the two that handled a code fence (carve#982).
 *
 * The rows below are the cross product that makes the sharing checkable: five
 * collectors x three fence kinds. A mutation reverting ONE collector fails only
 * its own rows; a mutation removing ONE fence kind from the shared helper fails
 * that kind in all five, which is what "one spelling" means here.
 *
 * `markup-carve/carve#966` is why this is a checker fix rather than a normative
 * one: THE EXECUTABLE ARTIFACTS DECIDE NOTHING, so the oracle having answered
 * this the way the engines answer it was a measurement, never the rule.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').replace(/> </g, '><').trim()

// A code fence whose body holds a blank line. `a` and `b` are one code block.
const CODE = ['```', 'a', '', 'b', '```']
// A colon fence whose body holds a blank line. `a` and `b` are two paragraphs
// of ONE admonition.
const COLON = ['::: note', 'a', '', 'b', ':::']
// A comment fence whose body holds a blank line. It renders nothing at all.
const COMMENT = ['%%%', 'a', '', 'b', '%%%']

const doc = (...lines) => lines.join('\n') + '\n'

// --- the list `+` collector (attachFlushLeft) ------------------------------
// The largest severing group, and the one no corpus row could pin while the
// oracle severed it too.

test('a `+`-attached code fence stays whole inside a list item', () => {
  assert.equal(
    html(doc('- x', '+', ...CODE, '', 'z')),
    '<ul><li>x <pre><code>a b </code></pre></li></ul><p>z</p>',
  )
})

test('a `+`-attached colon fence stays whole inside a list item', () => {
  assert.equal(
    html(doc('- x', '+', ...COLON, '', 'z')),
    '<ul><li>x <aside class="admonition note"><p>a</p><p>b</p></aside></li></ul><p>z</p>',
  )
})

test('a `+`-attached comment fence stays whole inside a list item', () => {
  // The whole span is invisible, so the item holds only its lead text and
  // nothing escapes to document level.
  assert.equal(html(doc('- x', '+', ...COMMENT, '', 'z')), '<ul><li>x</li></ul><p>z</p>')
})

// --- the list `+` FIRST-BLOCK form (`- +`), same collector -----------------

test('a first-block `- +` keeps its code fence whole', () => {
  assert.equal(
    html(doc('- +', ...CODE, '', 'z')),
    '<ul><li><pre><code>a b </code></pre></li></ul><p>z</p>',
  )
})

test('a first-block `- +` keeps its colon fence whole', () => {
  assert.equal(
    html(doc('- +', ...COLON, '', 'z')),
    '<ul><li><aside class="admonition note"><p>a</p><p>b</p></aside></li></ul><p>z</p>',
  )
})

test('a first-block `- +` keeps its comment fence whole', () => {
  assert.equal(html(doc('- +', ...COMMENT, '', 'z')), '<ul><li></li></ul><p>z</p>')
})

// --- the block-quote `+` collector (takeOneBlock) --------------------------

test('a `+`-attached code fence stays whole inside a block quote', () => {
  assert.equal(
    html(doc('> q', '+', ...CODE, '', 'z')),
    '<blockquote><p>q</p><pre><code>a b </code></pre></blockquote><p>z</p>',
  )
})

test('a `+`-attached colon fence stays whole inside a block quote', () => {
  assert.equal(
    html(doc('> q', '+', ...COLON, '', 'z')),
    '<blockquote><p>q</p><aside class="admonition note"><p>a</p><p>b</p></aside></blockquote><p>z</p>',
  )
})

test('a `+`-attached comment fence stays whole inside a block quote', () => {
  assert.equal(html(doc('> q', '+', ...COMMENT, '', 'z')), '<blockquote><p>q</p></blockquote><p>z</p>')
})

// --- the footnote and `dd` collectors (takePulledBlockEnd) -----------------
// The code-fence row here is the one that already held; it is kept as the
// control that says the fix moved the OTHER collectors onto this answer rather
// than moving this one.

const NOTE_TAIL = '<p><a href="#fnref1" role="doc-backlink">↩</a></p>'
const REF = '<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>'
const note = (body) =>
  `${REF}<section role="doc-endnotes"><hr><ol><li id="fn1"><p>n</p>${body}</li></ol></section>`

test('a `+`-attached code fence stays whole inside a footnote body', () => {
  assert.equal(
    html(doc('[^f]: n', '+', ...CODE, '', 'see[^f]')),
    note(`<pre><code>a b </code></pre>${NOTE_TAIL}`),
  )
})

test('a `+`-attached colon fence stays whole inside a footnote body', () => {
  assert.equal(
    html(doc('[^f]: n', '+', ...COLON, '', 'see[^f]')),
    note(`<aside class="admonition note"><p>a</p><p>b</p></aside>${NOTE_TAIL}`),
  )
})

test('a `+`-attached comment fence stays whole inside a footnote body', () => {
  // Invisible, so the note body is its definition line and the backlink only.
  assert.equal(
    html(doc('[^f]: n', '+', ...COMMENT, '', 'see[^f]')),
    `${REF}<section role="doc-endnotes"><hr><ol><li id="fn1"><p>n<a href="#fnref1" role="doc-backlink">↩</a></p></li></ol></section>`,
  )
})

test('a `+`-attached code fence stays whole inside a `dd`', () => {
  assert.equal(
    html(doc(':: t', ':  d', '+', ...CODE, '', 'z')),
    '<dl><dt>t</dt><dd><p>d</p><pre><code>a b </code></pre></dd></dl><p>z</p>',
  )
})

test('a `+`-attached colon fence stays whole inside a `dd`', () => {
  assert.equal(
    html(doc(':: t', ':  d', '+', ...COLON, '', 'z')),
    '<dl><dt>t</dt><dd><p>d</p><aside class="admonition note"><p>a</p><p>b</p></aside></dd></dl><p>z</p>',
  )
})

test('a `+`-attached comment fence stays whole inside a `dd`', () => {
  assert.equal(html(doc(':: t', ':  d', '+', ...COMMENT, '', 'z')), '<dl><dt>t</dt><dd>d</dd></dl><p>z</p>')
})

// --- controls --------------------------------------------------------------

// Each of the three holds byte-identically at the commit before the fix, which
// is what makes them controls: they pin the part of L3 the fix must NOT move,
// so a mutation that reverts a collector leaves them green while its own rows
// go red.

test('a blank line still ends a `+`-attached UNFENCED block', () => {
  // The boundary rule L3 states is intact; the fix only stops it reaching
  // inside a block. Without this the change could have been "attach
  // everything", which L3 does not say.
  assert.equal(html(doc('- x', '+', 'p', '', 'z')), '<ul><li>x p </li></ul><p>z</p>')
})

test('an UNTERMINATED fence still ends at the blank line', () => {
  // No closer means no fenced block to run through, so the helper falls back to
  // its line scan - the same answer the code-fence spelling has always given
  // for this shape. Left where it was: no clause names the unterminated case
  // for an attached block, so the fix does not invent one.
  assert.equal(html(doc('- x', '+', '```', 'a', '', 'z')), '<ul><li>x <pre><code>a </code></pre></li></ul><p>z</p>')
})

test('a sibling marker still ends a `+`-attached block', () => {
  assert.equal(html(doc('- x', '+', 'p', '- y')), '<ul><li>x p </li><li>y</li></ul>')
})
