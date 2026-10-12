import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P0-009 X1 and CARVE-P9-053 grant retention only below the content column.
const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (depth, lines) => lines.map((line) => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\n'

const deepestItem = source => {
  let item
  const visit = blocks => {
    for (const block of blocks) {
      if (block.t === 'list') {
        item = block.items[0].blocks
        visit(item)
      } else if (block.children) visit(block.children)
    }
  }
  // Only the first block: a released marker line starts a document list of its own.
  visit(parse(source).blocks.slice(0, 1))
  return item
}

const hosts = { plain: [[], 0], nested: [['- x'], 2], boxed: [['- ::: box'], 2] }
const comments = { line: ['%% c'], span: ['%%%', 'hidden', '%%%'] }
const followers = { text: ['code'], fence: ['```', 'code'], span: ['``x'] }
for (const depth of [0, 1, 2]) for (const [host, [outer, pad]] of Object.entries(hosts)) for (const head of ['inner', '::: inner', '# h']) {
  for (const [kind, comment] of Object.entries(comments)) for (const [shape, follower] of Object.entries(followers)) {
    // Under a plain outer item a fence run in the child's band is that outer
    // item's own opener at a block start (CARVE-P0-004), so nothing is retained.
    if (host === 'nested' && shape === 'fence') continue
    const at = ' '.repeat(pad + 2)
    const band = ' '.repeat(pad + 1)
    const lines = [...outer, ' '.repeat(pad) + '- ' + head, ...comment.map((line) => at + line), ...follower.map((line) => band + line)]
    for (const tail of depth > 0 ? ['TAIL', '- TAIL', '1. TAIL'] : ['TAIL']) {
      test(`an at-column comment releases the line below: depth ${depth}, ${host}, ${head}, ${kind} comment, ${shape}, ${tail}`, () => {
        const out = html(quoted(depth, lines) + tail + '\n')
        const headSource = quoted(depth, [...outer, ' '.repeat(pad) + '- ' + head])
        assert.deepEqual(deepestItem(quoted(depth, lines) + tail + '\n'), deepestItem(headSource), out)
        assert.ok(out.includes('TAIL'), out)
      })
    }
    if (depth === 0) test(`a line at document column 0 after the comment is not retained: ${host}, ${head}, ${kind} comment, ${shape}`, () => {
      const out = html([...lines.slice(0, -follower.length), ...follower].join('\n') + '\nTAIL\n')
      assert.match(out, /<\/ul>(?!.*<\/li>).*TAIL/)
    })
  }
}

test('at-column spans release the fence to the box', () => {
  const tail = ['>     %%%', '>     hidden', '>     %%%', '>    ```', '>    code', '- tail', ''].join('\n')
  assert.match(html('> - ::: box\n>   - inner\n' + tail), /<li>inner<\/li>/)
  assert.match(html('> - ::: box\n>   - ::: inner\n' + tail), /<div class="inner"><\/div>/)
})

test('a document paragraph keeps a noninterrupting marker', () => {
  assert.match(html('- inner\n  %% c\n code\n- tail\n'), /<\/ul><p>code - tail<\/p>/)
})
