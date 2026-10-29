import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const code = out => [...out.matchAll(/<pre><code>([^]*?)<\/code><\/pre>/g)].map(m => m[1])

// PART 0 S2: an item hands a blank run to a description or footnote child's
// open fence as it does to a sublist's (carve#4047).
test('a description child keeps the run before the line that ends it', () => {
  assert.deepEqual(code(html('- :: t\n  : ```\n    code\n\nafter\n')), ['code\n\n'])
})

test('a footnote child keeps the run before the line that ends it', () => {
  assert.deepEqual(code(html('x[^1]\n\n- [^1]: ```\n    code\n\nafter\n')), ['code\n\n'])
})

test('the sublist twin is unchanged', () => {
  assert.deepEqual(code(html('- - ```\n    code\n\nafter\n')), ['code\n\n'])
})

const wrappers = { '- ': 2, '1. ': 3, '- - ': 4, '1. - ': 5 }
const hosts = {
  description: [':: t', ': ```'],
  'second description': [':: t', ': a', ': ```'],
  note: ['[^1]: ```'],
}

for (const [name, head] of Object.entries(hosts)) {
  const ref = name === 'note' ? 'x[^1]\n\n' : ''
  for (const [marker, width] of Object.entries(wrappers)) {
    for (const run of [1, 3]) {
      test(`${name} under "${marker}" matches its document-level reading with a run of ${run}`, () => {
        const body = [...head, '  code']
        const blanks = '\n'.repeat(run)
        const plain = ref + body.join('\n') + '\n' + blanks + 'after\n'
        const item = ref + body.map((line, k) => (k ? ' '.repeat(width) : marker) + line).join('\n') + '\n' + blanks + 'after\n'
        assert.deepEqual(code(html(item)), code(html(plain)))
        assert.deepEqual(code(html(item)), ['code\n' + '\n'.repeat(run)])
      })
    }
  }
}

test('a closed fence in a description child keeps no run', () => {
  assert.deepEqual(code(html('- :: t\n  : ```\n    code\n    ```\n\nafter\n')), ['code\n'])
})

test('a colon after a paragraph is no description', () => {
  assert.equal(html('- p\n  : ```\n    code\n\nafter\n'), '<ul>\n  <li>p\n: <code>\ncode</code></li>\n</ul>\n<p>after</p>')
})
