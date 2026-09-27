import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

test('unfinished nested fences retain every trailing blank', () => {
  for (const fence of ['```', '~~~']) for (const blanks of [1, 2, 3]) {
    for (const depth of [0, 1, 2, 3]) for (const tail of ['out', '# Heading', '- next', '']) {
      let source = `- head\n\n   ${fence}\n   body\n${'\n'.repeat(blanks)}${tail}\n`
      for (let i = 0; i < depth; i++) source = '- parent\n' + source.split('\n').slice(0, -1).map((line) => '  ' + line).join('\n') + '\n'
      const html = renderDoc(parse(source))
      const expected = `body\n${'\n'.repeat(blanks + (tail === '' ? 1 : 0))}</code></pre>`
      assert.ok(html.includes(expected), JSON.stringify({source, html, expected}))
    }
  }
})

test('a comment containing a blank cannot hide the later code fence', () => {
  const source = '- p\n  - head\n\n    %%%\n    a\n\n    ```\n    %%%\n\n    ```\n    body\n\n\n  out\n'
  assert.ok(renderDoc(parse(source)).includes('body\n\n\n</code></pre>'))
})

test('outer tails preserve payload and three blanks still split sibling lists', () => {
  for (const tail of ['out', '# Heading', '- next']) {
    const source = '- parent\n  - head\n\n     ```\n     body\n\n\n' + tail + '\n'
    assert.ok(renderDoc(parse(source)).includes('body\n\n\n</code></pre>'))
  }
  const html = renderDoc(parse('- head\n\n   ```\n   body\n\n\n\n- next\n'))
  assert.ok(html.includes('</ul>\n<ul>'))
})

test('an attached block does not add a blank to an unfinished descendant fence', () => {
  const source = '- p\n  - head\n\n     ```\n     body\n\n+\nflush\n'
  const html = renderDoc(parse(source))
  assert.ok(html.includes('body\n\n</code></pre>'), html)
})

test('a comment closer outside the item cannot hide its unfinished code fence', () => {
  for (const closer of ['%%%', '  %%%']) {
    const source = '- p\n  - head\n\n    %%%\n    ```\n    body\n\n\n\n  out\n\n' + closer + '\n'
    assert.ok(renderDoc(parse(source)).includes('body\n\n\n\n</code></pre>'))
  }
})

test('an attached block keeps the separator inside the item own fence', () => {
  const html = renderDoc(parse('- p\n\n  ```\n  code\n+\nflush\n'))
  assert.ok(html.includes('code\n\nflush\n'), html)
})

test('an overindented comment can close at its owning item column', () => {
  for (const indent of [5, 6]) {
    const pad = ' '.repeat(indent)
    const source = `- p\n  - head\n\n${pad}%%%\n${pad}a\n\n${pad}\`\`\`\n    %%%\n\n    \`\`\`\n    body\n\n\n  out\n`
    assert.ok(renderDoc(parse(source)).includes('body\n\n\n</code></pre>'))
  }
})

test('a lazy paragraph line keeps the descendant comment scope', () => {
  const source = '- p\n  - head\nlazy\n\n    %%%\n    ```\n    body\n\n\n  out\n\n  %%%\n'
  assert.ok(renderDoc(parse(source)).includes('body\n\n\n</code></pre>'))
})
