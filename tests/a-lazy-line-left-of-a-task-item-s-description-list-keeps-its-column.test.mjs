import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5319: the task box shifts the item's body, but a lazy line left of the
// body keeps its column, so ` : b` is not at the item's marker column (PART 0 S4).
const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()
const stanza = '<div class="line-block"><p>&nbsp;&nbsp;x<br>\n: b</p></div>'

test('the reported document folds ` : b` into the stanza', () => {
  assert.ok(html('* [ ] a\n      :: t\n      : u\n        ::: |\n          x\n : b\n').endsWith(`${stanza}</dd></dl></li></ul>`))
})

test('a description that opens the line block on its marker line folds it too', () => {
  assert.ok(html('- [x] a\n      :: t\n      : ::: |\n          x\n : b\n').endsWith(`${stanza}</dd></dl></li></ul>`))
})

test('a nested task item folds a line right of its marker column', () => {
  assert.ok(html('- o\n  - [ ] a\n        :: t\n        : u\n          ::: |\n            x\n   : b\n').includes(stanza))
})

test('at a nested task item\'s marker column the line ends that item', () => {
  assert.ok(html('- o\n  - [ ] a\n        :: t\n        : u\n          ::: |\n            x\n  : b\n').endsWith('</dl></li></ul>\n    : b</li></ul>'))
})

test('at the item\'s own marker column the line still ends it (carve#5312)', () => {
  assert.ok(html('* [ ] a\n      :: t\n      : u\n        ::: |\n          x\n: b\n').endsWith('</li></ul><p>: b</p>'))
})

test('a plain follower between the columns renders no indentation', () => {
  assert.ok(html('- [ ] a\n      :: t\n      : u\n        ::: |\n          x\n     b\n').includes('&nbsp;&nbsp;x<br>\nb</p>'))
})
