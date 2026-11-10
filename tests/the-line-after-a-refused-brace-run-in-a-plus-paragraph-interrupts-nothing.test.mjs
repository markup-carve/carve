import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830 supersedes carve#5181's follower exception.
const html = source => renderDoc(parse(source))
const oracle = source => html(source.replace('{', '\\{'))

for (const source of [
  '- a\n+\n{x\ny}\n  > c\n',
  ...['- a', '1. a', '- [ ] a'].flatMap(host =>
    ['# c', '::: d', '| c |', ':: t', '{.k}'].map(follower =>
      `${host}\n+\n{x\ny}\n${host.startsWith('1.') ? '   ' : '  '}${follower}\n`)),
  '- a\n+\n{x\ny}\n  ```\n  k\n  ```\n  > z\n',
  '- a\n+\n{x\ny}\n  > c\n  > d\n',
]) test('a refused opener claims no attached follower', () => {
  assert.equal(html(source), oracle(source), source)
})

test('without a refused run a block at the content column still ends the paragraph', () => {
  assert.equal(html('- a\n+\nb\n  > c\n').replace(/\n[ \t]*(?=<)/g, '').trim(),
    '<ul><li>a\n    b<blockquote><p>c</p></blockquote></li></ul>')
})
