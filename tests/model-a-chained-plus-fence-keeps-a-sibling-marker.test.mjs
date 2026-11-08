import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, '')

// carve#5499: only the closer, a line left of the fence or its first blank ends it.
test('a marker line in a chained plus\'s unclosed fence is payload with or without a later blank', () => {
  for (const [head, fence] of [['- - +', '  '], ['1. - +', '   '], ['- 1. +', '  '], ['- - - +', '    ']]) {
    for (const marker of ['- z', '* z', '+ z', '1. z', '2) z', '- [ ] z']) {
      for (const tail of ['', '\nq\n', '\n\nq\n']) {
        const out = html(`${head}\n${fence}\`\`\`\n${fence}${marker}\n${tail}`)
        assert.ok(out.includes(`<pre><code>${marker}</code></pre>`), `${head} / ${marker} / ${JSON.stringify(tail)}: ${out}`)
        if (tail) assert.ok(out.endsWith('<p>q</p>'), `${head} / ${marker}: ${out}`)
      }
    }
  }
})

test('the first blank still ends the chained plus\'s unclosed fence', () => {
  assert.equal(html('- - +\n  ```\n  - z\n\n    q\n'), '<ul><li><ul><li><pre><code>- z</code></pre><p>q</p></li></ul></li></ul>')
  assert.equal(html('- - +\n  ```\n  - z\n\n  - w\n'), '<ul><li><ul><li><pre><code>- z</code></pre></li><li><p>w</p></li></ul></li></ul>')
})

test('a line left of the chained plus\'s fence still ends it', () => {
  assert.equal(html('- - +\n    ```\n  - z\n\nq\n'), '<ul><li><ul><li><pre><code></code></pre></li><li>z</li></ul></li></ul><p>q</p>')
})

test('a one-level plus keeps its sibling-marker bound', () => {
  assert.equal(html('- +\n```\n- z\n\nq\n'), '<ul><li><pre><code></code></pre></li><li>z</li></ul><p>q</p>')
  assert.equal(html('- +\n```\n- +\n'), '<ul><li><pre><code>- +</code></pre></li></ul>')
})
