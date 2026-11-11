import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// carve#5755 (ruling C): a leading tab is measured per frame, so a tab-led brace
// line that continues an open paragraph reads as its per-frame space spelling.
const hosts = [
  ['a note', (b) => `[^n]: p\n${b}\nx[^n]\n`, '\t\t', 6],
  ['a description in a note', (b) => `[^n]: p\n    :: t\n    : pre\n${b}\nx[^n]\n`, '\t\t', 6],
  ['a description in a note, space then tab', (b) => `[^n]: p\n    :: t\n    : pre\n${b}\nx[^n]\n`, ' \t\t', 6],
  ['a description', (b) => `:: t\n: pre\n${b}`, '  \t', 6],
  ['an item', (b) => `- a\n${b}`, '\t\t', 6],
  ['a nested item', (b) => `- a\n  - b\n${b}`, '  \t', 6],
  ['an ordered item', (b) => `1. a\n${b}`, '\t\t', 7],
  ['a marker-line note', (b) => `- [^n]: p\n${b}\nx[^n]\n`, '  \t', 6],
]
const runs = [['{% x', '%}'], ['{.x', '.y}'], ['{#i', '.y}']]
for (const [name, host, tabbed, column] of hosts) for (const [opener, closer] of runs) {
  for (let at = column - 2; at <= column + 2; at++) {
    test(`${name}: ${JSON.stringify(tabbed)}${opener} reads as ${column} spaces with its closer at column ${at}`, () => {
      const run = (lead) => host(`${lead}${opener}\n${' '.repeat(at)}${closer}\n`)
      assert.equal(html(run(tabbed)), html(run(' '.repeat(column))))
    })
  }
}

test('the carve#5755 reproduction keeps the valid run hidden', () => {
  const source = '[^n]: p\n    :: t\n    : pre\n\t\t{% x\n       %}\n\nx[^n]\n'
  assert.match(html(source), /<dd>pre\n<\/dd>/)
})

test('a tab-led brace line in a code fence stays payload', () => {
  const source = '- a\n  ```\n\t\t{.x\n       .y}\n  ```\n'
  assert.match(html(source), /<pre><code> *\{\.x\n *\.y\}\n<\/code><\/pre>/)
})
