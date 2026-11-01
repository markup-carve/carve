import test from 'node:test'
import assert from 'node:assert/strict'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

for (const depth of [1, 2]) for (const nested of [false, true]) {
  for (const offset of [0, 1, 3]) for (const tail of ['tail', '- tail']) {
    test(`opened fence clears quote claim: depth ${depth}, nested ${nested}, offset ${offset}, ${tail}`, () => {
      const prefix = '> '.repeat(depth)
      const source = ['- ::: box', ...(nested ? ['  - inner', '    %% c'] : []),
        ' '.repeat(2 + offset) + '```', ' '.repeat(2 + offset) + 'code']
        .map(line => prefix + line).join('\n') + '\n' + tail + '\n'
      const doc = parse(source)
      const out = renderDoc(doc)
      assert.equal(doc.blocks.length, 2, out)
      assert.equal(doc.blocks[1].t, tail === 'tail' ? 'para' : 'list', out)
      assert.match(out, /<pre><code>code\n<\/code><\/pre>/)
      assert.ok(out.endsWith(tail === 'tail' ? '<p>tail</p>' : '<ul>\n  <li>tail</li>\n</ul>'), out)
    })
  }
  // An invalid info string keeps the run from opening (carve#4018 opens every valid one).
  test(`unopened shifted run keeps lazy continuation: depth ${depth}, nested ${nested}`, () => {
    const prefix = '> '.repeat(depth)
    const source = ['- ::: box', ...(nested ? ['  - inner', '    %% c'] : []),
      '  paragraph', '   ```js,title="x"', '   code'].map(line => prefix + line).join('\n') + '\ntail\n'
    const doc = parse(source)
    const out = renderDoc(doc)
    assert.equal(doc.blocks.length, 1, out)
    assert.ok(!out.includes('<pre>'), out)
    assert.ok(JSON.stringify(doc).includes('tail'), out)
  })
}

for (const depth of [1, 2]) {
  // The comment below the inner item's column closes that item (carve#3885),
  // so the fence opens in the box and the unprefixed `- tail` starts a new list.
  test(`a below-column comment closes the item and the fence run opens in the box: depth ${depth}`, () => {
    const prefix = '> '.repeat(depth)
    const source = ['- ::: box', '  - inner', '  %% c', '   ```', '   code']
      .map(line => prefix + line).join('\n') + '\n- tail\n'
    const doc = parse(source)
    const out = renderDoc(doc)
    assert.equal(doc.blocks.length, 2, out)
    assert.ok(out.includes('<li>inner</li>') && out.includes('<pre><code>code\n</code></pre>'), out)
    assert.ok(out.endsWith('<ul>\n  <li>tail</li>\n</ul>'), out)
  })
}
