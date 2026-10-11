import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'

const payloads = node => {
  if (!node || typeof node !== 'object') return []
  const own = node.t === 'raw' || node.t === 'code' ? [node] : []
  return own.concat(Object.values(node).flatMap(payloads))
}
for (const [head, column] of [['- - > a', 4], ['- - a', 4], ['- * a', 4], ['- 1. a', 5], ['- - - a', 6]]) {
  for (const [run, info, kind] of [['```', '=html', 'raw'], ['```', '=latex', 'raw'], ['```', 'html', 'code'], ['~~~', 'html', 'code']]) {
    for (const blanks of [1, 2]) {
      test(`${head}, ${run}${info}, ${blanks} blank payload lines`, () => {
        const source = `${head}\n\n${' '.repeat(column)}${run}${info}\n${' '.repeat(column + 2)}${run}\n${'\n'.repeat(blanks)}tail\n`
        const document = parse(source)
        const nodes = payloads(document.blocks)
        assert.equal(nodes.length, 1)
        assert.equal(nodes[0].t, kind)
        assert.equal(nodes[0].text, `  ${run}${'\n'.repeat(blanks + (kind === 'code' ? 1 : 0))}`)
        assert.equal(document.blocks.at(-1).t, 'para')
      })
    }
  }
}

for (const [name, source, expected] of [
  ['container-base closer', '- - a\n\n      ```=html\n      x\n    ```\n\ntail\n', 'x'],
  ['longer closer', '- - a\n\n    ```=html\n    x\n    ````\n\ntail\n', 'x'],
  ['root overindent remains payload', '```=html\nx\n  ```\n\ntail\n', 'x\n  ```\n\ntail'],
]) {
  test(name, () => {
    const nodes = payloads(parse(source).blocks)
    assert.equal(nodes.length, 1)
    assert.equal(nodes[0].text, expected)
  })
}
