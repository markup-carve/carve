// carve#5151, CARVE-P0-005 and corpus 0190: a `%%%` span that a `+` skips is one comment,
// so a definition inside it registers nothing, as it does in a span that stands alone.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

const hosts = ['- a\n+', '- +', '1. a\n+', '> a\n+', ':: t\n: a\n+', ':: t\n: +', '[^n]: +', '- a\n  - b\n  +']
const spans = [['%%%', '%%%'], ['%%%%', '%%%%'], ['%%% x', '%%%']]
const tails = ['', 'text\n', '> q\n', '\n']

for (const host of hosts) {
  test(`${JSON.stringify(host)}: a definition in the skipped span is comment text`, () => {
    const pad = host.endsWith('  +') ? '  ' : ''
    for (const [open, close] of spans) {
      for (const tail of tails) {
        const span = [open, '[r]: /u', '*[A]: b', close].map((line) => pad + line).join('\n')
        const source = `${host}\n${span}\n${tail}\nSee [r][] and A.\n`
        assert.match(html(source), /<p>See \[r\]\[\] and A\.<\/p>$/, source)
      }
    }
  })
}

test('the block after the span still attaches, and a definition outside it still registers', () => {
  assert.equal(html('- a\n+\n%%%\n[r]: /u\n%%%\ntext\n\nSee [r][].\n'), '<ul><li>atext</li></ul><p>See [r][].</p>')
  assert.equal(html('- a\n+\n%%%\n[r]: /u\n%%%\n[r]: /v\ntext\n\nSee [r][].\n'), '<ul><li>atext</li></ul><p>See <a href="/v">r</a>.</p>')
})

test('the trace reads the skipped span as a comment, not as leaf lines', () => {
  const trace = []
  parse('- a\n+\n%%%\n[r]: /u\n%%%\ntext\n', { trace })
  const span = trace.filter((record) => record.line >= 3 && record.line <= 5).map(({ line, form, owner }) => [line, form, owner])
  assert.deepEqual(span, [
    [3, 'comment', 'doc/item:1/comment:3'],
    [4, 'payload', 'doc/item:1/comment:3'],
    [5, 'closer', 'doc/item:1/comment:3'],
  ])
})
