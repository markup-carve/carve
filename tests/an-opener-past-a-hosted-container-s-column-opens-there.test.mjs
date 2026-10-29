import test from 'node:test'
import assert from 'node:assert/strict'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const compact = source => html(source).replace(/\n */g, '')
const kinds = {
  colon: [[':::: inner', 'x', '::::'], '<div class="inner"><p>x</p></div>'],
  line: [['::: |', 'x', ':::'], '<div class="line-block"><p>x</p></div>'],
  backtick: [['```', 'x', '```'], '<pre><code>x</code></pre>'],
  tilde: [['~~~', 'x', '~~~'], '<pre><code>x</code></pre>'],
  heading: [['# h'], '<h1 id="h">h</h1>'],
  quote: [['> x'], '<blockquote><p>x</p></blockquote>'],
  break: [['---'], '<hr>'],
  table: [['| x |'], '<table><tbody><tr><td>x</td></tr></tbody></table>'],
}
for (const host of ['marker', 'continuation']) for (const depth of [0, 1, 2]) {
  for (const [kind, [lines, expected]] of Object.entries(kinds)) for (const offset of [1, 2, 4]) {
    const q = '> '.repeat(depth)
    const start = host === 'marker' ? ['- ::: box'] : ['- lead', '  ::: box']
    const source = paragraph => [...start, ...(paragraph ? ['  text'] : []), ...lines.map(line => ' '.repeat(2 + offset) + line), '  :::'].map(line => q + line).join('\n') + '\n'
    test(`${host}, depth ${depth}, ${kind}, offset ${offset}: opens inside the box`, () => {
      assert.ok(compact(source(false)).includes('<div class="box">' + expected + '</div>'), html(source(false)))
    })
    test(`${host}, depth ${depth}, ${kind}, offset ${offset}: interrupts an open paragraph as in an item`, () => {
      let owner = parse(source(true)).blocks[0]
      for (let n = 0; n < depth; n++) owner = owner.children[0]
      const box = owner.items[0].blocks.at(-1)
      assert.equal(box.t, 'colon-div')
      let item = parse(['- text', ...lines.map(line => ' '.repeat(2 + offset) + line)].map(line => q + line).join('\n') + '\n').blocks[0]
      for (let n = 0; n < depth; n++) item = item.children[0]
      assert.deepEqual(box.children, item.items[0].blocks)
    })
  }
}

const rootText = {
  colon: '<div class="inner"><p>x</p></div>', line: '<div class="line-block"><p>x</p></div>',
  backtick: '<pre><code>x</code></pre>', tilde: '<pre><code>x</code></pre>',
  heading: '<h1 id="h">h</h1>', quote: '<blockquote><p>x</p></blockquote>', break: '<hr>', table: '<table><tbody><tr><td>x</td></tr></tbody></table>',
}
const docText = {...rootText, heading: '<section id="h"><h1>h</h1></section>'}
for (const [kind, [lines]] of Object.entries(kinds)) for (const offset of [1, 2, 4]) {
  const body = lines.map(line => ' '.repeat(offset) + line).join('\n') + '\n'
  test(`document root opens shifted ${kind} at offset ${offset}`, () => {
    assert.equal(compact(body), docText[kind])
  })
  test(`a root box opens shifted ${kind} at offset ${offset}`, () => {
    assert.equal(compact('::: box\n' + body + ':::\n'), '<div class="box">' + rootText[kind] + '</div>')
  })
}
for (const sublist of [false, true]) test(`an item heading releases the child column, sublist ${sublist}`, () => {
  const source = '- outer\n' + (sublist ? '  - para\n    ```\n    code\n\n' : '') + '  # h\n    ```\n'
  assert.equal(compact(source), '<ul><li>outer' + (sublist ? '<ul><li>para<pre><code>code</code></pre></li></ul>' : '') + '<h1 id="h">h</h1><pre><code></code></pre></li></ul>')
})
test('a shifted reference definition opens on its authored base in a hosted box', () => {
  assert.equal(compact('- ::: box\n   [r]: /url\n  :::\n\n[r][]\n'), '<ul><li><div class="box"></div></li></ul><p><a href="/url">r</a></p>')
})
for (const nested of [false, true]) test(`a comment releases the below-child-column fence to the box, nested box ${nested}`, () => {
  const source = '> - ::: box\n>   - ' + (nested ? '::: inner' : 'inner') + '\n>     %%%\n>     hidden\n>     %%%\n>    ```\n>    code\n- tail\n'
  const inner = nested ? '<div class="inner"></div>' : 'inner'
  assert.equal(compact(source), '<blockquote><ul><li><div class="box"><ul><li>' + inner + '</li></ul><pre><code>code</code></pre></div></li></ul></blockquote><ul><li>tail</li></ul>')
})

for (const host of ['description', 'footnote']) for (const depth of [0, 1, 2]) {
  for (const [kind, [lines]] of Object.entries(kinds)) for (const offset of [1, 2, 4]) {
    test(`${host}, depth ${depth}, ${kind}, offset ${offset}: interrupts as in an item`, () => {
      const q = '> '.repeat(depth)
      const start = host === 'description' ? [':: term', ': ::: box'] : ['[^n]: ::: box']
      const source = [...start, '  text', ...lines.map(line => ' '.repeat(2 + offset) + line), '  :::'].map(line => q + line).join('\n') + '\n'
      const doc = parse(source)
      let owner = doc.blocks[0]
      for (let n = 0; n < depth && owner; n++) owner = owner.children[0]
      const box = host === 'description' ? owner.items[1].ddBlocks[0] : doc.footnoteDefs.get('n')[0]
      const item = parse(['- text', ...lines.map(line => ' '.repeat(2 + offset) + line)].join('\n') + '\n').blocks[0]
      assert.deepEqual(box.children, item.items[0].blocks)
    })
  }
}

for (const lines of [['```', 'x'], ['~~~', 'x'], [':::broken']]) {
  for (const offset of [1, 2, 4]) test(`a hosted box uses item interruption for ${JSON.stringify(lines)}, offset ${offset}`, () => {
    const shifted = lines.map(line => ' '.repeat(2 + offset) + line)
    const box = parse(['- ::: box', '  text', ...shifted, '  :::'].join('\n') + '\n').blocks[0].items[0].blocks[0]
    // An unclosed fence takes the box's closer as content (carve#4018), so the
    // item twin carries that line too.
    const fence = lines[0] !== ':::broken'
    const item = parse(['- text', ...shifted, ...(fence ? ['  :::'] : [])].join('\n') + '\n').blocks[0].items[0]
    assert.deepEqual(box.children, item.blocks)
  })
}

test('a shifted reference interrupts an open paragraph in a hosted box as in an item', () => {
  assert.equal(compact('- ::: box\n  text\n   [r]: /url\n  :::\n\n[r][]\n'), '<ul><li><div class="box"><p>text</p></div></li></ul><p><a href="/url">r</a></p>')
})
