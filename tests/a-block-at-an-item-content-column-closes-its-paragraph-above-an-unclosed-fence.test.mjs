import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A block at an item's content column ends the item's paragraph
// (CARVE-P0-010, CARVE-P0-011), so an unclosed fence below opens no span and
// the container's own closer ends it.
const render = (lines) => renderDoc(parse(`::: note\n${lines.join('\n')}\n\`\`\`\ncode\n::::\n:::\nafter *b*\n`))
const endsAtCloser = /<pre><code>code\n::::\n<\/code><\/pre>\n<\/aside>\n<p>after <strong>b<\/strong><\/p>$/
const runsOn = /<p>after <strong>b<\/strong><\/p>\n\s*<\/div>/

for (const [name, lines] of [
  ['link definition', ['- para', '  [r]: /u']],
  ['ordered item definition', ['1. para', '   [r]: /u']],
  ['quoted item definition', ['> - para', '>   [r]: /u']],
  ['task item definition', ['- [ ] para', '  [r]: /u']],
  ['definition past the column', ['- para', '    [r]: /u']],
  ['definition at the outer item column', ['- a', '  - para', '  [r]: /u']],
  ['table row', ['- para', '  | t |']],
  ['ordered item table row', ['10. para', '    | t |']],
  ['quoted item table row', ['> - para', '>   | t |']],
  ['nested item table row', ['- a', '  - para', '    | t |']],
  ['attribute line', ['- para', '  {#x}']],
  ['heading', ['- para', '  # H']],
  ['thematic break', ['- para', '  ---']],
  ['table row under an attributed marker', ['-{#x} para', '  | t |']],
  ['table row under an attributed ordered marker', ['1.{#x} para', '   | t |']],
]) test(`${name} at the item content column closes the paragraph, so the fence ends at the closer`, () => {
  assert.match(render(lines).trim(), endsAtCloser)
})

for (const [name, lines, expected] of [
  ['definition below the column', ['- para', ' [r]: /u'], endsAtCloser],
  ['definition below the column of an item with trailing spaces', ['- para  ', ' [r]: /u'], endsAtCloser],
  ['table row below the column', ['10. para', '   | t |'], endsAtCloser],
  ['item prose after a table row', ['- para', '  | t |', '  more'], runsOn],
]) test(`control: ${name} ${expected === runsOn ? 'leaves a paragraph open, so the fence is paragraph text' : 'closes the item, so the fence ends at the closer'}`, () => {
  assert.match(render(lines).trim(), expected)
})

// A footnote body takes a lazy line like every container (carve#3885): the
// closerless fence and its payload fold into the note, and the bare `::::`
// opens a div in the admonition that `:::` does not close, as after a quote.
test('a footnote definition at the item content column takes the closerless fence as note text', () => {
  const html = render(['- para', '  [^f]: n']).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
  assert.equal(html, '<aside class="admonition note" aria-label="Note"><ul><li>para</li></ul><div><div><p>after<strong>b</strong></p></div></div></aside>')
  assert.deepEqual(parse('- para\n  [^f]: n\n```\ncode\n').footnoteDefs.get('f')[0].lines.map((l) => l.replace(/^\u0000L\u0000/, '')), ['n', '```', 'code'])
})
