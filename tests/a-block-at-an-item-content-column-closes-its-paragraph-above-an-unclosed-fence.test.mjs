import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A block at an item's content column ends the item's paragraph
// (CARVE-P0-010, CARVE-P0-011); the unclosed fence below opens in the admonition
// and, with no host-closer clause (carve#4018), runs to the end of input.
const render = (lines) => renderDoc(parse(`::: note\n${lines.join('\n')}\n\`\`\`\ncode\n::::\n:::\nafter *b*\n`))
const runsToEnd = /<\/(?:ul|ol|blockquote|table)>\n\s*<pre><code>code\n::::\n:::\nafter \*b\*\n<\/code><\/pre>\n<\/aside>$/

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
]) test(`${name} at the item content column closes the paragraph, so the fence runs past the closer`, () => {
  assert.match(render(lines).trim(), runsToEnd)
})

for (const [name, lines] of [
  ['definition below the column', ['- para', ' [r]: /u']],
  ['definition below the column of an item with trailing spaces', ['- para  ', ' [r]: /u']],
  ['table row below the column', ['10. para', '   | t |']],
  ['item prose after a table row', ['- para', '  | t |', '  more']],
]) test(`control: after ${name} the fence opens in the admonition and runs past the closer`, () => {
  assert.match(render(lines).trim(), runsToEnd)
})

// A fence opener is not a lazy line (carve#4018): it ends the note's paragraph
// and, below the note's column, opens in the admonition.
test('a footnote definition at the item content column does not take the closerless fence', () => {
  const html = render(['- para', '  [^f]: n']).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
  assert.equal(html, '<aside class="admonition note" aria-label="Note"><ul><li>para</li></ul><pre><code>code :::: ::: after *b*</code></pre></aside>')
  assert.deepEqual(parse('- para\n  [^f]: n\n```\ncode\n').footnoteDefs.get('f')[0].lines.map((l) => l.replace(/^\u0000L\u0000/, '')), ['n'])
})
