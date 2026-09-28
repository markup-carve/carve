import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

for (const [name, head, column] of [
  ['bullet', '- a\n  - %%%', 4],
  ['ordered', '1. a\n   1. %%%', 6],
  ['task', '- a\n  - [x] %%%', 4],
  ['task with extra space', '- a\n  - [x]  %%%', 5],
  ['three levels', '- a\n  - b\n    - %%%', 6],
  ['stacked markers', '- - %%%', 4],
]) {
  for (const follower of ['tail', ' tail', '# heading']) {
    test(`${name}: marker comment ownership ignores the closer column before ${follower}`, () => {
      const source = (closer) => `${head}\n${' '.repeat(column)}HIDDEN\n${' '.repeat(closer)}%%%\n${follower}\n`
      const expected = html(source(column))
      assert.ok(!expected.includes('HIDDEN'), expected)
      assert.ok(expected.endsWith(follower === '# heading' ? '<h1>heading</h1>\n</section>' : '<p>tail</p>'), expected)
      for (let closer = 0; closer <= column + 2; closer++) {
        assert.equal(html(source(closer)), expected, `closer column ${closer}`)
      }
    })
  }
}

test('a marker line comment and a terminated span give the follower the same owner', () => {
  assert.equal(html('- a\n  - %% line\ntail\n'), html('- a\n  - %%%\n    hidden\n%%%\ntail\n'))
})

test('an unmatched marker fence leaves ordinary payload visible', () => {
  assert.ok(html('- a\n  - %%%\n    visible\ntail\n').includes('visible'))
})

test('payload below the inner item column ends that item', () => {
  const out = html('- a\n  - %%%\n  visible\n%%%\ntail\n')
  assert.ok(out.includes('visible'), out)
  assert.ok(out.indexOf('visible') > out.indexOf('</ul>'), out)
})

test('comment-shaped text in a code body opens no marker comment', () => {
  const out = html('- a\n  ```\n  - %%%\n  hidden\n  ```\n%%%\ntail\n')
  assert.ok(out.includes('- %%%\nhidden'), out)
})

test('extra spaces after a task marker remain valid in a description body', () => {
  assert.doesNotThrow(() => html(':: term\n:  - [x]  x\n'))
})

test('stacked marker comment classification grows linearly with depth', () => {
  const count = (depth) => {
    const source = '- '.repeat(depth) + '%%%\n' + ' '.repeat(depth * 2) + 'hidden\n%%%\ntail\n'
    const exec = RegExp.prototype.exec
    let calls = 0
    RegExp.prototype.exec = function (value) {
      calls++
      return Reflect.apply(exec, this, [value])
    }
    try { parse(source) } finally { RegExp.prototype.exec = exec }
    return calls
  }
  const small = count(64)
  const large = count(128)
  assert.ok(small > 64)
  assert.ok(large / small < 2.25, `${small} -> ${large} regex calls`)
})
