import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

// A span the body holds is asked about once per collected line; the scan resumes from its memo,
// so 4x the payload may not be 16x the charged work (2,000 lines were charged 4,006,000).
for (const [name, head, open] of [
  ['description in an item', '- :: t\n  : ::: |\n', '    %%%\n'],
  ['description', ':: t\n: ::: |\n', '  %%%\n'],
  ['footnote', '[^n]: x\n', '  %%%\n'],
]) {
  test(`${name}: a held span's payload at column 0 is charged once per line`, () => {
    const work = (n) => {
      resetLayoutWork()
      parse(head + open + '%%%% p\n'.repeat(n) + open + 'z\n')
      return { tail: layoutWork.commentTail, scan: layoutWork.commentScan }
    }
    const small = work(1000)
    const large = work(4000)
    assert.ok(small.tail > 0, `${name}: the comment tail was never read`)
    assert.ok(large.tail / small.tail < 6, `${name}: commentTail 1000=${small.tail}, 4000=${large.tail}`)
    assert.ok(large.scan / small.scan < 6, `${name}: commentScan 1000=${small.scan}, 4000=${large.scan}`)
  })
}
