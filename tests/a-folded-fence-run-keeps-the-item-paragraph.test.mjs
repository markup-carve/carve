import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('a folded fence run leaves a later blank-separated paragraph loose', () => {
  assert.equal(render('- o\n  ```\n```\n\n  t\n'),
    '<ul>\n  <li><p>o\n<code>\n</code></p>\n    <p>t</p>\n  </li>\n</ul>')
  for (const run of ['```', '~~~']) {
    const source = `- o\n  ${run}\n${run}\n\n  t\n`
    assert.match(render(source), /<li><p>o/)
    assert.match(render(source), /<p>t<\/p>/)

    const blankBeforeCloser = `- h\n  ${run}\n\n  b\n${run}\n`
    const html = render(blankBeforeCloser)
    assert.match(html, /<li><p>h/)
    assert.match(html, /<p>b/)

    const letterInsteadOfCloser = `- o\n  ${run}\nx\n\n  t\n`
    assert.match(render(letterInsteadOfCloser), /<li><p>o/)
    assert.match(render(letterInsteadOfCloser), /<p>t<\/p>/)
  }
})

test('a folded nested fence run keeps the next below-column line in the child paragraph', () => {
  assert.equal(render('- o\n  - h\n    ```\n```\n'),
    '<ul>\n  <li>o\n    <ul>\n      <li>h\n<code>\n</code></li>\n    </ul>\n  </li>\n</ul>')
  for (const run of ['```', '~~~']) {
    const source = `- o\n  - h\n    ${run}\n${run}\n`
    const html = render(source)
    assert.doesNotMatch(html, /<pre>/)
    if (run === '```') assert.match(html, /<code>\n<\/code>/)
    else assert.match(html, /<li>h\n~~~\n~~~<\/li>/)

    const letter = render(`- o\n  - h\n    ${run}\nx\n`)
    assert.doesNotMatch(letter, /<p>x<\/p>/)
    assert.match(letter, /<li>h/)
  }
})

test('folded fence work grows with the number of independent items', () => {
  const visits = count => {
    resetLayoutWork()
    parse('- o\n  ```\n```\n\n  t\n'.repeat(count))
    return layoutWork.lineVisits
  }
  const small = visits(128)
  const large = visits(256)
  assert.ok(small > 0)
  assert.ok(large <= 2 * small + 2, `128=${small}, 256=${large}`)
})
