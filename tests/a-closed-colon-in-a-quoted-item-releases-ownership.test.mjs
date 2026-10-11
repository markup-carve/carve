import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'
import {readFileSync} from 'node:fs'

for (const depth of [1, 2]) for (const marker of ['-', '*', '1.']) {
  for (const width of [3, 4, 5]) for (const body of ['', 'text']) for (const column of [0, 2]) {
    test(`depth ${depth}, ${marker}, ${width} colons, ${body || 'empty'}, tail ${column}`, () => {
      const quote = '> '.repeat(depth)
      const floor = marker.length + 1
      const run = ':'.repeat(width)
      const prefix = `${quote}${marker} ${run} box\n` +
        (body ? `${quote}${' '.repeat(floor)}${body}\n` : '') +
        `${quote}${' '.repeat(floor)}${run}\n`
      const tail = `${' '.repeat(column)}- tail\n`
      assert.deepEqual(parse(prefix + tail).blocks, [...parse(prefix).blocks, ...parse(tail).blocks])
    })
  }
}

for (const depth of [1, 2]) for (const comment of ['%% line\n', '%%%\ncomment\n%%%\n']) {
  test(`depth ${depth}, comment ${JSON.stringify(comment)}`, () => {
    const quote = '> '.repeat(depth)
    const middle = comment.trimEnd().split('\n').map(line => quote + line + '\n').join('')
    const prefix = `${quote}- ::: box\n${middle}${quote}  :::\n`
    assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
  })
}

for (const depth of [1, 2]) for (const indent of [0, 2]) {
  test(`depth ${depth}, colon inside indented comment ${indent}`, () => {
    const quote = '> '.repeat(depth)
    const pad = ' '.repeat(indent)
    const prefix = `${quote}- ::: box\n${quote}${pad}%%%\n${quote}  :::\n${quote}${pad}%%%\n${quote}  :::\n`
    assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
  })
  test(`depth ${depth}, colon inside code`, () => {
    const quote = '> '.repeat(depth)
    const prefix = `${quote}- ::: box\n${quote}  ${"```"}html\n${quote}  :::\n${quote}  ${"```"}\n${quote}  :::\n`
    assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
  })
}

for (const info of ['', ' box']) {
  test(`sibling item does not inherit the preceding colon fence: ${info || 'bare'}`, () => {
    const prefix = `> - ::: box\n>   text\n> - sib\n>   :::${info}\n`
    assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
  })
}

test('an unterminated comment fence remains a line comment before a hosted body', () => {
  const prefix = '> - ::: box\n> %%%\n>   text\n>   :::\n'
  assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
})

test('absorbed bare colon runs retain the paragraph owner', () => {
  const source = '> - :::bad\n' + '>   :::\n'.repeat(2000) + '- tail\n'
  const doc = parse(source)
  assert.equal(doc.blocks.length, 1)
  assert.equal(doc.blocks[0].t, 'quote')
})

for (const [first, next] of [['9.', '10.'], ['-', '1.']]) {
  test(`a wider sibling marker ends the preceding colon host: ${first} to ${next}`, () => {
    const pad = ' '.repeat(first.length + 1)
    const prefix = `> ${first} ::: box\n> ${pad}text\n> ${next} sib\n> ${pad}::: other\n`
    const blocks = parse(prefix + '- tail\n').blocks
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].t, 'quote')
  })
}
for (const depth of [1, 2]) for (const count of [196, 197, 198, 199, 200, 201]) {
  test(`colon nesting cap at quote depth ${depth}, ${count} containers`, () => {
    const quote = '> '.repeat(depth)
    const prefix = `${quote}- ::: box\n` + `${quote}  ::: box\n`.repeat(count - 1)
    let last = parse(prefix).blocks.at(-1)
    while (last) {
      if (last.t === 'list') last = last.items.at(-1).blocks.at(-1)
      else if (last.children?.length) last = last.children.at(-1)
      else break
    }
    const actual = parse(prefix + '- tail\n').blocks
    if (last.t === 'para') assert.equal(actual.length, 1)
    else assert.deepEqual(actual, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
  })
}

const shared = JSON.parse(readFileSync(new URL('../resources/quoted-item-colon-ownership-fixtures.json', import.meta.url), 'utf8'))
for (const item of shared) {
  test(`shared HTML: ${item.name}`, () => assert.equal(renderDoc(parse(item.source)).trim(), item.html.trim()))
}

for (const body of ['lazy\n', '  body\n> lazy\n']) {
  test(`a lazy quoted div keeps its host: ${JSON.stringify(body)}`, () => {
    const prefix = `> - ::: box\n> ${body}>   :::\n`
    assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
  })
}
