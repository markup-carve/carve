import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

// carve#4148: each `- +` measured its attached sublist with a throwaway parse
// and then parsed it for real, so a chain of nested first-block items doubled
// its work per level.
const chain = (depth, follower) => {
  let source = ''
  for (let level = 0; level < depth; level++) source += ' '.repeat(2 * level) + '- +\n'
  return source + follower
}
const work = (source) => {
  resetLayoutWork()
  parse(source)
  return layoutWork.scan + layoutWork.lineVisits
}

for (const follower of ['```\nx\n```\n', 'para\n', '> q\n']) {
  test(`a nested first-block chain before ${JSON.stringify(follower)} does not double per level`, () => {
    const small = work(chain(10, follower))
    const large = work(chain(20, follower))
    assert.ok(large <= small * 30, `depth 10: ${small}, depth 20: ${large}`)
  })
}
