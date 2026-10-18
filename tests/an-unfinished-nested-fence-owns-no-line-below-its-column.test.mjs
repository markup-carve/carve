import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const fences = ['```', '~~~', '```=html', '``` js', '~~~ js']
const hosts = [
  ['description', [':: t', ': - FENCE']],
  ['nested list', ['- - FENCE']],
  ['sublist', ['- a', '  - FENCE']],
]
const leaves = node => {
  if (Array.isArray(node)) return node.flatMap(leaves)
  if (!node || typeof node !== 'object') return []
  return [...(['code', 'raw'].includes(node.t) ? [node] : []), ...Object.values(node).flatMap(leaves)]
}

for (const depth of [0, 1, 2]) {
  for (const [host, lead] of hosts) {
    for (const fence of fences) {
      for (const payload of [[], ['    x'], ['    x', '', '    y']]) {
        test(`${host}, ${fence}, quote depth ${depth}, ${payload.length} payload rows releases document tail`, () => {
          const prefix = '> '.repeat(depth)
          const source = [...lead.map(line => line.replace('FENCE', fence)), ...payload]
            .map(line => prefix + line).join('\n') + '\ntail\n'
          const ast = parse(source)
          assert.deepEqual(ast.blocks.at(-1), { t: 'para', lines: ['tail'] })
          const body = leaves(ast.blocks)
          assert.equal(body.length, 1)
          assert.equal(body[0].text, payload.map(line => line.slice(4)).join('\n') + (payload.length ? '\n' : ''))
          assert.ok(renderDoc(ast).trim().endsWith('<p>tail</p>'))
        })
      }
      test(`${host}, ${fence}, quote depth ${depth} keeps content-column payload`, () => {
        const prefix = '> '.repeat(depth)
        const source = [...lead.map(line => line.replace('FENCE', fence)), '    x', '', '    tail']
          .map(line => prefix + line).join('\n') + '\n'
        const ast = parse(source)
        assert.equal(leaves(ast.blocks)[0].text, 'x\n\ntail\n')
        assert.equal(ast.blocks.some(node => node.t === 'para'), false)
      })
    }
  }
}

for (const fence of fences) {
  test(`description and list hosts agree on a body-column follower after ${fence}`, () => {
    const list = parse(`- a\n  - ${fence}\n    x\n  y\n`).blocks[0].items[0].blocks
    const description = parse(`:: t\n: - ${fence}\n    x\n  y\n`).blocks[0].items[1].ddBlocks
    assert.deepEqual(description, list.slice(1))
  })
}

test('a closed nested fence in a description does not hide the item\'s own second paragraph', () => {
  const source = '- intro\n  :: t\n  : - ```\n      x\n      ```\n  tail\n\n  second\n'
  assert.equal(parse(source).blocks[0].tight, false)
  assert.match(renderDoc(parse(source)).replace(/\s+/g, ''), /<p>tail<\/p><p>second<\/p><\/li>/)
})

test('a new outer-item paragraph after a nested fence stores its own lazy claim', () => {
  const source = '- - - ```\n  tail\ntail\n'
  const ast = parse(source)
  assert.equal(ast.blocks.length, 1)
  assert.deepEqual(ast.blocks[0].items[0].blocks.at(-1), { t: 'para', lines: ['tail', 'tail'] })
})

test('an invalid fence opener starts a paragraph with a lazy claim', () => {
  const source = '- - ```\n  ```foo bar\ntail\n'
  const ast = parse(source)
  assert.equal(ast.blocks.length, 1)
  assert.deepEqual(ast.blocks[0].items[0].blocks.at(-1), { t: 'para', lines: ['```foo bar', 'tail'] })
})

test('a new outer-item fence after a nested fence stores no lazy claim', () => {
  const source = '- - ```\n  ```\ntail\n'
  const ast = parse(source)
  assert.deepEqual(ast.blocks.at(-1), { t: 'para', lines: ['tail'] })
  assert.equal(ast.blocks[0].items[0].blocks.at(-1).t, 'code')
  assert.equal(ast.blocks[0].items[0].blocks.at(-1).text, '')
})

test('an outer-item fence with payload still ends at its host column', () => {
  const source = '- - ```\n  ```\n  x\ntail\n'
  const ast = parse(source)
  assert.deepEqual(ast.blocks.at(-1), { t: 'para', lines: ['tail'] })
  assert.equal(ast.blocks[0].items[0].blocks.at(-1).text, 'x\n')
})

test('a quoted outer-item paragraph stores its own claim after a nested fence', () => {
  const source = '> - - - ```\n>   tail\n> tail\n'
  const html = renderDoc(parse(source))
  assert.match(html, /      tail\ntail\n    <\/li>/)
  assert.doesNotMatch(html, /<p>tail<\/p>/)
})

test('quote padding does not change the outer-item paragraph claim', () => {
  const source = '>  - - - ```\n>    tail\n>  tail\n'
  const html = renderDoc(parse(source))
  assert.match(html, /      tail\ntail\n    <\/li>/)
  assert.doesNotMatch(html, /<p>tail<\/p>/)
})
