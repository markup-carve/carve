import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

// Only an invalid opener folds: a valid one always opens (carve#4018).
const bad = (run) => `${run}js title="x"`

test('a folded fence run leaves a later blank-separated paragraph loose', () => {
  assert.equal(render(`- o\n  ${bad('```')}\n${bad('```')}\n\n  t\n`),
    '<ul>\n  <li><p>o\n<code>js title="x"\n</code>js title=“x”</p>\n    <p>t</p>\n  </li>\n</ul>')
  for (const run of ['```', '~~~']) {
    const source = `- o\n  ${bad(run)}\n${bad(run)}\n\n  t\n`
    assert.match(render(source), /<li><p>o/)
    assert.match(render(source), /<p>t<\/p>/)

    const blankBeforeCloser = `- h\n  ${bad(run)}\n\n  b\n${bad(run)}\n`
    const html = render(blankBeforeCloser)
    assert.match(html, /<li><p>h/)
    assert.match(html, /<p>b/)

    const letterInsteadOfCloser = `- o\n  ${bad(run)}\nx\n\n  t\n`
    assert.match(render(letterInsteadOfCloser), /<li><p>o/)
    assert.match(render(letterInsteadOfCloser), /<p>t<\/p>/)
  }
})

test('a folded nested fence run keeps the next below-column line in the child paragraph', () => {
  assert.equal(render(`- o\n  - h\n    ${bad('```')}\n${bad('```')}\n`),
    '<ul>\n  <li>o\n    <ul>\n      <li>h\n<code>js title="x"\n</code>js title=“x”</li>\n    </ul>\n  </li>\n</ul>')
  for (const run of ['```', '~~~']) {
    const html = render(`- o\n  - h\n    ${bad(run)}\n${bad(run)}\n`)
    assert.doesNotMatch(html, /<pre>/)
    if (run === '~~~') assert.match(html, /<li>h\n~~~js title=“x”\n~~~js title=“x”<\/li>/)

    const letter = render(`- o\n  - h\n    ${bad(run)}\nx\n`)
    assert.doesNotMatch(letter, /<p>x<\/p>/)
    assert.match(letter, /<li>h/)
  }
})

test('folded fence work grows with the number of independent items', () => {
  const visits = count => {
    resetLayoutWork()
    parse(`- o\n  ${bad('```')}\n${bad('```')}\n\n  t\n`.repeat(count))
    return layoutWork.lineVisits
  }
  const small = visits(128)
  const large = visits(256)
  assert.ok(small > 0)
  assert.ok(large <= 2 * small + 2, `128=${small}, 256=${large}`)
})
