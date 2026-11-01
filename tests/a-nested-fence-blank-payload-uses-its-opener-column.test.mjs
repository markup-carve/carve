import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'

const payload = (source) => {
  const visit = (blocks) => {
    for (const block of blocks) {
      if (block.t === 'code' || block.t === 'raw') return block.text
      for (const children of [block.blocks, block.children, block.items]) {
        if (!children) continue
        const found = visit(children)
        if (found !== undefined) return found
      }
    }
  }
  return visit(parse(source).blocks)
}

test('a nested fence removes its opener indentation from blank payload lines', () => {
  for (const fence of ['```', '~~~', '```=html']) {
    for (let spaces = 0; spaces <= 10; spaces++) {
      const source = `- [ ] - :::\n        ${fence}\n${' '.repeat(spaces)}\n`
      assert.equal(payload(source), `${' '.repeat(Math.max(0, spaces - 8))}\n`, source)
    }
  }
})
