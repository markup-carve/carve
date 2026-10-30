/*
 * A lone `+` at a task sublist's literal column gives that sublist its next
 * block whatever the block is, as the plain twin does (§17 L3, carve#4367).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').replace(/ disabled> /g, ' disabled>')
const inner = (html) => /<ul class="task-list"><li><input type="checkbox" disabled><ul><li>(.*)<\/li><\/ul><\/li><\/ul>$/.exec(html)?.[1]

const blocks = [
  ['> q', '<blockquote><p>q</p></blockquote>'],
  ['# h', '<h1 id="h">h</h1>'],
  ['```\n      c\n      ```', '<pre><code>c </code></pre>'],
  ['::: d\n      p\n      :::', '<div class="d"><p>p</p></div>'],
  ['{.c}\n      p', '<p class="c">p</p>'],
  ['***', '<hr>'],
]

for (const [block, html] of blocks) {
  for (const gap of ['', '\n']) {
    const source = `- [ ] - x\n${gap}      +\n      ${block}\n`
    test(JSON.stringify(source), () => {
      const body = inner(render(source))
      assert.ok(body?.endsWith(html), render(source))
      assert.ok(!body.includes('+'), render(source))
    })
  }
}

test('the task item reads its sublist like the plain twin', () => {
  for (const [block] of blocks) {
    const task = render(`- [ ] - x\n      +\n      ${block}\n`)
    const plain = render(`- - x\n  +\n  ${block.replaceAll('\n      ', '\n  ')}\n`)
    assert.equal(task.replace('<ul class="task-list"><li><input type="checkbox" disabled>', '<ul><li>'), plain)
  }
})

test('a + at the task item content column stays text', () => {
  assert.match(render('- [ ] - x\n\n  +\n  > q\n'), /<ul><li>x<\/li><\/ul><p>\+<\/p><blockquote><p>q<\/p><\/blockquote>/)
})

test('a line below the sublist after the block leaves it', () => {
  assert.match(render('- [ ] - x\n      +\n      # h\n  z\n'), /<ul><li>x <h1 id="h">h<\/h1><\/li><\/ul> z <\/li>/)
})
