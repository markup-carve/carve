import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (depth, lines) => lines.map((line) => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\n'

// CARVE-P0-004: a recognized opener past the content column takes its authored
// column as the base of that one block (CARVE-P2-017).
for (const depth of [0, 1, 2]) for (const box of ['::: box', ':::', ':::: w']) for (const child of ['::: note', '::: inner', '::: tip "T"']) {
  for (const over of [1, 2, 4]) for (const closed of [true, false]) {
    const pad = ' '.repeat(2 + over)
    const body = [pad + child, pad + 'x', pad + ':::', ...(closed ? ['  ' + box.split(' ')[0]] : [])]
    for (const before of [[], [''], ['  text', '']]) {
      test(`a named opener past the column opens inside the hosted container: depth ${depth}, ${box}, ${child}, +${over}, closed ${closed}, before ${JSON.stringify(before)}`, () => {
        const out = html(quoted(depth, ['- ' + box, ...before, ...body]) + 'TAIL\n')
        assert.match(out, /<p>x<\/p><\/(aside|div)><\/div><\/li><\/ul>/)
        assert.match(out, depth > 0 ? /<\/blockquote><p>TAIL<\/p>$/ : /<\/ul><p>TAIL<\/p>$/)
      })
    }
    test(`under a paragraph of the container it opens: depth ${depth}, ${box}, ${child}, +${over}, closed ${closed}`, () => {
      const out = html(quoted(depth, ['- ' + box, '  text', ...body]) + 'TAIL\n')
      assert.match(out, /<p>text<\/p><(aside|div)/)
    })
  }
}

// CARVE-P0-014: only closers inside the container count, and a blank followed
// by a line below the column has ended a nested item as it ends a top-level one.
for (const depth of [0, 1, 2]) for (const nesting of [0, 1, 2]) for (const follower of ['y', '# h', '> q']) for (const blank of ['', 'padded']) {
  test(`a run after the item ended closes nothing: depth ${depth}, nesting ${nesting}, ${follower}, blank ${JSON.stringify(blank)}`, () => {
    const lines = []
    for (let k = 0; k < nesting; k++) lines.push(' '.repeat(2 * k) + '- outer' + k)
    const marker = ' '.repeat(2 * nesting)
    lines.push(marker + '- para', marker + '  ```', marker + '  code', blank ? marker + '  ' : '', marker + follower, marker + '  ```')
    const source = lines.map((line) => (blank ? '> '.repeat(depth) + line : ('> '.repeat(depth) + line).trimEnd())).join('\n') + '\n'
    // The first run closes nothing, so `code` is no code block's payload. The
    // last run may open one of its own past the outer item's column.
    assert.ok(!html(source).includes('<pre><code>code'), html(source))
  })
  test(`without the blank the run is searched past the line and closes the fence: depth ${depth}, nesting ${nesting}, ${follower}`, () => {
    const lines = []
    for (let k = 0; k < nesting; k++) lines.push(' '.repeat(2 * k) + '- outer' + k)
    const marker = ' '.repeat(2 * nesting)
    lines.push(marker + '- para', marker + '  ```', marker + '  code', marker + '  ```', marker + follower)
    assert.ok(html(quoted(depth, lines)).includes('<pre><code>code'))
  })
}
