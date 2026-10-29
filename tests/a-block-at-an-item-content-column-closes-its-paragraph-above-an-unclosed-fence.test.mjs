import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// An unclosed fence opens whatever paragraph sits above it and runs to the end
// of its container, colon closers included (carve#4018).
const render = (lines) => renderDoc(parse(`::: note\n${lines.join('\n')}\n\`\`\`\ncode\n::::\n:::\nafter *b*\n`))
const runsToEnd = /<pre><code>code\n::::\n:::\nafter \*b\*\n<\/code><\/pre>\n<\/aside>$/

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
]) test(`${name} at the item content column: the fence runs to the end of the note`, () => {
  assert.match(render(lines).trim(), runsToEnd)
})

for (const [name, lines] of [
  ['definition below the column', ['- para', ' [r]: /u']],
  ['definition below the column of an item with trailing spaces', ['- para  ', ' [r]: /u']],
  ['table row below the column', ['10. para', '   | t |']],
  ['item prose after a table row', ['- para', '  | t |', '  more']],
]) test(`control: ${name}: the fence runs to the end of the note`, () => {
  assert.match(render(lines).trim(), runsToEnd)
})

// The fence interrupts the note's paragraph rather than folding into it.
test('a footnote definition at the item content column leaves the closerless fence outside the note', () => {
  assert.match(render(['- para', '  [^f]: n']).trim(), runsToEnd)
  assert.deepEqual(parse('- para\n  [^f]: n\n```\ncode\n').footnoteDefs.get('f')[0].lines.map((l) => l.replace(/^\u0000L\u0000/, '')), ['n'])
})
