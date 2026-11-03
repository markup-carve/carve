// A `%%%` span opened on a description or note marker line closes at a closer below the column (carve#4996).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('the ticket shapes', () => {
  assert.equal(html('- a\n  :: u\n  : %%%\n%%%\nc\n'),
    '<ul>\n  <li>a\n    <dl>\n      <dt>u</dt>\n      <dd></dd>\n    </dl>\n  </li>\n</ul>\n<p>c</p>')
  assert.equal(html('- a\n\n  [^n]: %%%\n%%%\nc\n'), '<ul>\n  <li>a</li>\n</ul>\n<p>c</p>')
  assert.equal(html(':: u\n: %%%\n    n\n\n%%%\nc\n'), '<dl>\n  <dt>u</dt>\n  <dd></dd>\n</dl>\n<p>c</p>')
  assert.equal(html('- a\n  :: u\n  : %%%\n\n%%%\n  c\n'),
    '<ul>\n  <li>a\n    <dl>\n      <dt>u</dt>\n      <dd></dd>\n    </dl>\n    c\n  </li>\n</ul>')
})

test('a colon line with no term before it opens no description, so its span is not the body\'s', () => {
  assert.equal(html('- a\n\n\n  : %%%\n%%%\nc\n'), '<ul>\n  <li><p>a</p>\n    <p>:</p>\n  </li>\n</ul>')
})

// Indentation is part of neither delimiter (PART 9 §28) and a blank in an open span is
// payload (PART 0 S1), so moving the span below its owner's column changes nothing.
test('a span below the column reads as the same span at its owner column', () => {
  const hosts = [
    [['- a', '  :: u'], 4, '  : %%%'],
    [['- a', ''], 4, '  [^n]: %%%'],
    [['- a'], 4, '  - %%%'],
    [['1. a', '   :: u'], 5, '   : %%%'],
    [['- a', '  - b', '    :: u'], 6, '    : %%%'],
    [[':: u'], 2, ': %%%'],
    [[], 2, '[^n]: %%%'],
    [['- a', '  :: u', '  : x'], 4, '  : %%%'],
  ]
  let checked = 0
  for (const [head, owner, opener] of hosts) {
    for (const payload of [null, '%% x']) for (const blanks of [0, 1, 2]) for (const tail of [null, 'c', '  c', '    c', '- c']) {
      const doc = (col) => [...head, opener, ...(payload ? [' '.repeat(col) + payload] : []), ...Array(blanks).fill(''),
        ' '.repeat(col) + '%%%', ...(tail === null ? [] : [tail])].join('\n') + '\n'
      for (let col = 0; col < owner; col++) {
        assert.equal(html(doc(col)), html(doc(owner)), JSON.stringify(doc(col)))
        checked++
      }
    }
  }
  assert.equal(checked, 930)
})

// The collectors ask whether the body holds a span once per line, so the scan resumes instead of restarting.
for (const [name, make] of [
  ['%% payload below the column', (n) => '- a\n  :: u\n  : %%%\n' + '%% x\n'.repeat(n) + '%%%\nc\n'],
  ['blank payload in a note', (n) => '- a\n\n  [^n]: %%%\n' + '\n%% x\n'.repeat(n) + '%%%\nc\n'],
  ['blank payload in a description', (n) => ':: u\n: %%%\n' + '\n%% x\n'.repeat(n) + '%%%\nc\n'],
]) {
  test(`a span with ${name} is scanned in linear time`, () => {
    const scanned = (n) => {
      resetLayoutWork()
      parse(make(n))
      return layoutWork.commentScan
    }
    const small = scanned(500)
    const large = scanned(2000)
    assert.ok(large <= small * 4 * 1.25, `500 lines: ${small} scanned, 2000 lines: ${large}`)
  })
}
