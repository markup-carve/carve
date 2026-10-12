import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P0-023: a line an item retains below its content column after a
// comment opens a paragraph there, and a later below-column line folds into it.
const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1')
const quoted = (depth, lines) => lines.map((line) => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\n'

const hosts = { plain: [[], 0], nested: [['- x'], 2], boxed: [['- ::: box'], 2] }
const comments = { line: ['%% c'], span: ['%%%', 'hidden', '%%%'] }
const followers = { text: [['code'], 'code'], fence: [['```', 'code'], 'code'], span: [['``x'], 'x'] }
for (const depth of [0, 1, 2]) for (const [host, [outer, pad]] of Object.entries(hosts)) for (const head of ['inner', '::: inner', '# h']) {
  for (const [kind, comment] of Object.entries(comments)) for (const [shape, [follower, last]] of Object.entries(followers)) {
    // Under a plain outer item a fence run in the child's band is that outer
    // item's own opener at a block start (CARVE-P0-004), so nothing is retained.
    if (host === 'nested' && shape === 'fence') continue
    const at = ' '.repeat(pad + 2)
    const band = ' '.repeat(pad + 1)
    const lines = [...outer, ' '.repeat(pad) + '- ' + head, ...comment.map((line) => at + line), ...follower.map((line) => band + line)]
    // A marker at document column 0 opens a list beside an unquoted one, so
    // only the quoted spellings fold it.
    for (const tail of depth > 0 ? ['TAIL', '- TAIL', '1. TAIL'] : ['TAIL']) {
      test(`the line below folds into the retained paragraph: depth ${depth}, ${host}, ${head}, ${kind} comment, ${shape}, ${tail}`, () => {
        const out = html(quoted(depth, lines) + tail + '\n')
        assert.ok(out.includes(`${last} ${tail}</`), out)
        assert.ok(!/<\/(ul|blockquote)>(<p>)?[^<]*TAIL/.test(out), out)
      })
    }
    if (depth === 0) test(`a line at document column 0 after the comment is not retained: ${host}, ${head}, ${kind} comment, ${shape}`, () => {
      const out = html([...lines.slice(0, -follower.length), ...follower].join('\n') + '\nTAIL\n')
      assert.match(out, /<\/ul>(?!.*<\/li>).*TAIL/)
    })
  }
}

test('the ruled source and its sibling read alike', () => {
  const tail = ['>     %%%', '>     hidden', '>     %%%', '>    ```', '>    code', '- tail', ''].join('\n')
  assert.match(html('> - ::: box\n>   - inner\n' + tail), /<li>inner<code>code - tail<\/code><\/li>/)
  assert.match(html('> - ::: box\n>   - ::: inner\n' + tail), /<p><code>code - tail<\/code><\/p>/)
})

test('a sibling marker is recognized before the fold', () => {
  assert.match(html('- inner\n  %% c\n code\n- tail\n'), /code<\/li><li>tail<\/li>/)
})
