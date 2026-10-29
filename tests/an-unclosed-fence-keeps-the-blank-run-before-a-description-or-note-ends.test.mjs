import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const code = out => [...out.matchAll(/<pre><code>([^]*?)<\/code><\/pre>/g)].map(m => m[1])

// PART 0 S2: a blank reaches a description or footnote body as it reaches an item.
const hosts = {
  item: ['', '- '],
  description: ['', ':: t\n: '],
  note: ['x[^1]\n\n', '[^1]: '],
  'quoted description': ['', '> :: t\n> : '],
}

for (const [name, [pre, head]] of Object.entries(hosts)) {
  const quoted = name.startsWith('quoted')
  const indent = quoted ? '>   ' : '  '
  const blank = quoted ? '>\n' : '\n'
  for (const run of [1, 2, 3]) for (const tail of ['after\n', '']) {
    test(`${name}: an unclosed fence keeps a run of ${run} before ${tail ? 'a line at column 0' : 'the end of input'}`, () => {
      const source = pre + head + '```\n' + indent + 'code\n' + blank.repeat(run) + tail
      assert.deepEqual(code(html(source)), ['code\n' + '\n'.repeat(run)])
    })
  }
}

test('a fence on the marker line keeps the run too', () => {
  assert.deepEqual(code(html(':: t\n: ```\n\nafter\n')), ['\n'])
  assert.deepEqual(code(html('x[^1]\n\n[^1]: ```\n\nafter\n')), ['\n'])
})

test('the run still separates the entries of the description list', () => {
  const out = html(':: t\n: ```\n  code\n\n:: u\n: v\n')
  assert.deepEqual(code(out), ['code\n\n'])
  assert.match(out, /<dd>v<\/dd>/)
})

test('a block a + attached at column 0 does not take the run (PART 9 §17)', () => {
  assert.deepEqual(code(html('[^a]: +\n```\nx\n\nsee[^a]\n')), ['x\n'])
  assert.deepEqual(code(html(':: t\n: +\n```\nx\n\nsee\n')), ['x\n'])
})

test('a closed fence and a paragraph body are unchanged', () => {
  assert.deepEqual(code(html(':: t\n: ```\n  code\n  ```\n\nafter\n')), ['code\n'])
  assert.match(html(':: t\n: d\n\nafter\n'), /<dd>d<\/dd>/)
})
