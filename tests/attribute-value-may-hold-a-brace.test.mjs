/*
 * An attribute value may hold a `}` inside quotes, and every reader of an
 * attribute block has to know that.
 *
 * `{data-x="}"}` is a valid block, so a `\{[^}]*\}` run stops at the wrong
 * brace. What that costs depends on which reader is short:
 *
 *   - a MARKER's block (`1.{title="a}b"} item`): losing the block also unmakes
 *     the marker, so the whole line rendered as a paragraph where all three
 *     engines build the list item and set the attribute. Already fixed; pinned
 *     here so the two readers cannot diverge again.
 *   - a table CELL's block (`|{title="a}b"} a |`): the short run still matched
 *     something, so the cell got a TRUNCATED attribute (`title="a`) from the
 *     fragment before the quoted brace and kept `b"} a` as content. A wrong
 *     answer that looks like an answer.
 *   - a table ROW's block (`| a |{title="a}b"}`): the block no longer ends the
 *     line, so the row was not a row and the line became a paragraph.
 *
 * The oracle CLAIMS each of those inputs rather than refusing them, which puts
 * them in the DEFECT bucket scripts/formal-core-check.mjs exists to fail on - it
 * just never sees one, because no corpus document writes a `}` inside a quoted
 * value. So the shapes are generated here instead of waiting for a corpus case.
 *
 * Fixed three times in three places before the payload was declared once:
 * definition lines (carve#604), then the two markers, then the two table
 * readers (carve#716). It now has a single source, `ATTR_PAYLOAD`.
 *
 * The row reader carried a second defect the widening made reachable, and its
 * own test below: validity was tested at RENDER time and threw, so an invalid
 * payload refused the document where the grammar says the `{` is content.
 * carve#713 moved that decision for the CELL block and left the row's twin.
 *
 * Every expectation below is what carve-js renders, checked rather than
 * reasoned about.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

test('an ordered marker keeps its block when a value holds a brace', () => {
  const out = html('1.{title="a}b"} item\n')
  assert.match(out, /<ol>/, out)
  assert.match(out, /<li title="a}b">item<\/li>/, out)
})

test('a bullet marker keeps its block when a value holds a brace', () => {
  const out = html('-{title="a}b"} item\n')
  assert.match(out, /<ul>/, out)
  assert.match(out, /<li title="a}b">item<\/li>/, out)
})

test('a task bullet keeps its block when a value holds a brace', () => {
  // The task state is read after the block, so a short run loses the checkbox
  // as well as the attribute.
  const out = html('-{title="a}b"} [x] done\n')
  assert.match(out, /<li title="a}b"><input type="checkbox" checked disabled> done<\/li>/, out)
})

test('either quote style holds a brace', () => {
  assert.match(html("1.{title='a}b'} item\n"), /<li title="a}b">item<\/li>/)
  assert.match(html('1.{title="a}b"} item\n'), /<li title="a}b">item<\/li>/)
})

test('an escaped quote inside the value does not end the run', () => {
  // The control for the quoted-run branch: without escape handling the run
  // ends at the inner quote and the rest of the payload leaks out.
  const out = html('1.{title="a\\"b"} item\n')
  assert.match(out, /<li title="a&quot;b">item<\/li>/, out)
})

test('a row attribute block holds a brace', () => {
  const out = html('| a |{title="a}b"}\n')
  assert.match(out, /<tr title="a}b">/, out)
  assert.match(out, /<td>a<\/td>/, out)
})

test('a cell attribute block holds a brace, and is not truncated', () => {
  // The truncation is the point: `title="a` plus `b"} a` as content is the
  // shape this used to produce.
  const out = html('|{title="a}b"} a |\n')
  assert.match(out, /<td title="a}b">a<\/td>/, out)
  assert.ok(!out.includes('title="&quot;a"'), out)
})

test('the plain forms are untouched', () => {
  // The boundary. No quoted brace, nothing to widen, and the two behaviors the
  // cell reader gained most recently (glued block, invalid payload is text)
  // must survive the widening.
  assert.match(html('1.{#x} item\n'), /<li id="x">item<\/li>/)
  assert.match(html('| a | b |\n'), /<td>a<\/td><td>b<\/td>/)
  assert.match(html('|{.hl}Total |\n'), /<td class="hl">Total<\/td>/)
  assert.match(html('|{bad!!} Total |\n'), /<td>\{bad!!\} Total<\/td>/)
})

test('a marker whose block has no content after it is still prose', () => {
  // Widening the payload must not weaken MARKER REQUIRES CONTENT: the space
  // and content after the closing brace are still required.
  assert.match(html('1.{#x}\n'), /<p>/)
  assert.ok(!html('1.{#x}\n').includes('<ol>'), html('1.{#x}\n'))
  assert.match(html('1.{title="a}b"}\n'), /<p>/)
})

test('an invalid row payload is content, not a refusal', () => {
  // grammar.ebnf row_attributes: "the whole payload must be valid attribute
  // syntax (§15); otherwise the `{` is ordinary content and the line is not a
  // row attribute". The row reader tested validity at RENDER time and threw, so
  // both of these REFUSED the document where carve-js renders a paragraph - a
  // refusal is the one outcome the clause rules out. The first shape is only
  // reachable once the payload is quote-aware, the second always was.
  assert.match(html('| a |{bad!!="}"}\n'), /<p>/)
  assert.match(html('| a |{bad!!}\n'), /<p>\| a \|\{bad!!\}<\/p>/)
})

test('an unclosed brace run stays literal', () => {
  // The payload may consume to end of line, so the missing `}` has to be what
  // rejects these rather than the run stopping early. Both are paragraphs in
  // carve-js too - a leading `|` with no closing one is not a row at all, so
  // the quotes come out as smart quotes from the inline pass.
  assert.match(html('1.{title="a}b" item\n'), /<p>1\.\{title=/)
  assert.match(html('| a |{title="a}b"\n'), /<p>\| a \|\{title=/)
})
