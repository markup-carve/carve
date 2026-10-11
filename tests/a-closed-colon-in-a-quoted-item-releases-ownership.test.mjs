import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'
import {readFileSync} from 'node:fs'

for (const depth of [0, 1, 2]) for (const malformed of [false, true]) {
  test(`line-block payload opens no colon container at quote depth ${depth}, malformed ${malformed}`, () => {
    const quote = '> '.repeat(depth)
    const source = `${quote}- ::: |\n${quote}  :::: box\n${quote}  :::\n` +
      (malformed ? `${quote}  :::bad\n${quote}  :::\n` : '') + '- tail\n'
    const document = parse(source)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks[0], {t: 'line-block', lines: [':::: box']})
    if (depth > 0 && malformed) {
      assert.equal(document.blocks.length, 1)
      assert.deepEqual(owner.items[0].blocks[1].lines, [':::bad', ':::', '- tail'])
    } else if (depth > 0) {
      assert.deepEqual(document.blocks[1], parse('- tail\n').blocks[0])
    } else {
      assert.deepEqual(owner.items[1].blocks, parse('tail\n').blocks)
    }
  })
}

test('a nested line block ignores block-looking payload until its own closer', () => {
  const source = '::: box\n:::: |\n::::: inner\n%%%\n```\n- marker\n::::\n:::\n'
  const block = parse(source).blocks[0]
  assert.equal(block.t, 'colon-div')
  assert.deepEqual(block.children, [{t: 'line-block', lines: ['::::: inner', '%%%', '```', '- marker']}])
})

test('a hardbreak container still parses nested colon blocks', () => {
  const block = parse('::: \\\n:::: box\nx\n::::\n:::\n').blocks[0]
  assert.equal(block.t, 'hardbreaks')
  assert.equal(block.children[0].t, 'colon-div')
  assert.deepEqual(block.children[0].children, parse('x\n').blocks)
})

for (const depth of [1, 2]) for (const payload of ['%%%', '```', '- marker']) {
  test(`literal ${payload} in a line block does not change the following paragraph claim at depth ${depth}`, () => {
    const quote = '> '.repeat(depth)
    const source = `${quote}- ::: |\n${quote}  ${payload}\n${quote}  :::\n` +
      `${quote}  :::bad\n${quote}  :::\n- tail\n`
    const document = parse(source)
    assert.equal(document.blocks.length, 1)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks, [
      {t: 'line-block', lines: [payload]},
      {t: 'para', lines: [':::bad', ':::', '- tail']},
    ])
  })
}

for (const depth of [1, 2]) {
  test(`an overindented bare run does not close a hosted paragraph at depth ${depth}`, () => {
    const quote = '> '.repeat(depth)
    const document = parse(`${quote}- ::: box\n${quote}  a\n${quote}    :::\n- tail\n`)
    assert.equal(document.blocks.length, 1)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks[0].children, [{t: 'para', lines: ['a', ':::', '- tail']}])
  })
  test(`an overindented bare run stays line-block payload at depth ${depth}`, () => {
    const quote = '> '.repeat(depth)
    const document = parse(`${quote}- ::: |\n${quote}  a\n${quote}    :::\n${quote}  b\n- tail\n`)
    assert.equal(document.blocks.length, 2)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks, [{t: 'line-block', lines: ['a', '  :::', 'b']}])
    assert.deepEqual(document.blocks[1], parse('- tail\n').blocks[0])
  })
  for (const closer of [2, 4]) {
    test(`an authored overindented opener closes at column ${closer}, depth ${depth}`, () => {
      const quote = '> '.repeat(depth)
      const prefix = `${quote}- a\n${quote}    ::: box\n${quote}    x\n${quote}${' '.repeat(closer)}:::\n`
      assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
    })
  }
  for (const [name, body] of [
    ['closed', '\n    :::\n    t\n    :::\n'],
    ['empty', '\n    :::\n'],
    ['no blank', '    :::\n    t\n    :::\n'],
    ['one-column overindent', '\n   :::\n   t\n   :::\n'],
  ]) {
    test(`a bare authored opener needs no existing colon host: ${name}, depth ${depth}`, () => {
      const quote = '> '.repeat(depth)
      const prefix = `${quote}- a\n` + body.split('\n').slice(0, -1).map(line => quote + line + '\n').join('')
      assert.deepEqual(parse(prefix + '- tail\n').blocks, [...parse(prefix).blocks, ...parse('- tail\n').blocks])
    })
  }
}

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

test('a line-block comment span hides its colon closer and definitions', () => {
  const source = '::: |\n%%%\n:::\n[r]: /target\n%%%\n\n[t][r]\n'
  const document = parse(source)
  assert.deepEqual(document.blocks, [{t: 'line-block', lines: ['%%%', ':::', '[r]: /target', '%%%', '', '[t][r]']}])
  assert.doesNotMatch(renderDoc(document), /href=/)
})

test('a line-block comment span preserves payload until its actual closer', () => {
  const source = '::: |\n%%%\n:::\n  %%%\nkept\n:::\n\n[r]: /url\n\n[t][r]\n'
  const document = parse(source)
  assert.deepEqual(document.blocks, [{t: 'line-block', lines: ['%%%', ':::', '  %%%', 'kept']}, {t: 'para', lines: ['[t][r]']}])
  assert.match(renderDoc(document), /href="\/url"/)
})

for (const depth of [1, 2]) for (const run of ['%%%', '```', '~~~']) {
  const quote = '> '.repeat(depth)
  test(`a paired ${run} span hides colon closers at quote depth ${depth}`, () => {
    const source = `${quote}- ::: |\n${quote}  ${run}\n${quote}  :::\n${quote}  ${run}\n${quote}  :::\n${quote}  :::bad\n${quote}  :::\n- tail\n`
    const document = parse(source)
    assert.equal(document.blocks.length, 1)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks, [{t: 'line-block', lines: [run, ':::', run]}, {t: 'para', lines: [':::bad', ':::', '- tail']}])
  })
  test(`a paired ${run} span leaves no paragraph claim at quote depth ${depth}`, () => {
    const source = `${quote}- ::: |\n${quote}  ${run}\n${quote}  :::\n${quote}  ${run}\n${quote}  x\ntail\n`
    const document = parse(source)
    assert.equal(document.blocks.length, 2)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks, [{t: 'line-block', lines: [run, ':::', run, 'x']}])
    assert.deepEqual(document.blocks[1], parse('tail\n').blocks[0])
  })
}

for (const depth of [1, 2]) for (const run of ['```', '~~~']) {
  const quote = '> '.repeat(depth)
  test(`an indented ${run} payload opens no opaque span at quote depth ${depth}`, () => {
    const source = `${quote}- ::: |\n${quote}    ${run}\n${quote}  :::\n${quote}    ${run}\n${quote}  :::\n${quote}  :::bad\n${quote}  :::\n- tail\n`
    const document = parse(source)
    assert.equal(document.blocks.length, 2)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks, [{t: 'line-block', lines: [`  ${run}`]}, {t: 'code', lang: '', title: null, text: ':::\n:::bad\n:::\n'}])
    assert.deepEqual(document.blocks[1], parse('- tail\n').blocks[0])
  })
  test(`an authored line-block base locates a paired ${run} span at quote depth ${depth}`, () => {
    const source = `${quote}- a\n${quote}    ::: |\n${quote}    ${run}\n${quote}    :::\n${quote}    ${run}\n${quote}  :::\n${quote}  :::bad\n${quote}  :::\n- tail\n`
    const document = parse(source)
    assert.equal(document.blocks.length, 1)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks, [{t: 'para', lines: ['a']}, {t: 'line-block', lines: [run, ':::', run]}, {t: 'para', lines: [':::bad', ':::', '- tail']}])
  })
}

for (const depth of [1, 2]) {
  const quote = '> '.repeat(depth)
  test(`a sibling comment fence cannot close a line-block payload span at depth ${depth}`, () => {
    const source = `${quote}- ::: |\n${quote}  %%%\n${quote}  :::\n${quote}- b\n${quote}  %%%\n${quote}  para\nlazy\n`
    const document = parse(source)
    assert.equal(document.blocks.length, 1)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks, [{t: 'line-block', lines: ['%%%']}])
    assert.deepEqual(owner.items[1].blocks, [{t: 'para', lines: ['b']}, {t: 'para', lines: ['para', 'lazy']}])
  })
  for (const run of ['```', '~~~']) {
    test(`an authored line-block code span closes at its host column at depth ${depth}, ${run}`, () => {
      const source = `${quote}- a\n${quote}    ::: |\n${quote}    ${run}\n${quote}    :::\n${quote}  ${run}\n${quote}  :::\n${quote}  para\nlazy\n`
      const document = parse(source)
      assert.equal(document.blocks.length, 1)
      let owner = document.blocks[0]
      for (let n = 0; n < depth; n++) owner = owner.children[0]
      assert.deepEqual(owner.items[0].blocks, [{t: 'para', lines: ['a']}, {t: 'line-block', lines: [run, ':::', run]}, {t: 'para', lines: ['para', 'lazy']}])
    })
  }
}

for (const depth of [1, 2]) {
  const quote = '> '.repeat(depth)
  for (const run of ['```', '~~~']) {
    for (const type of [null, 'box']) {
      test(`shifted colon and ${run} lines remain paragraph text inside ${type ?? 'anonymous'} div at depth ${depth}`, () => {
        const source = `${quote}- b\n${quote.trimEnd()}\n${quote}  :::${type ? ' ' + type : ''}\n${quote}    ::: |\n${quote}    ${run}\n${quote}  :::\n${quote}  para\n${quote}  ${run}\nlazy\n`
        const document = parse(source)
        assert.equal(document.blocks.length, 1)
        let owner = document.blocks[0]
        for (let n = 0; n < depth; n++) owner = owner.children[0]
        assert.deepEqual(owner.items[0].blocks, [{t: 'para', lines: ['b']}, {t: 'colon-div', type, title: null, label: null, children: [{t: 'para', lines: ['::: |', run]}]}, {t: 'para', lines: ['para', run, 'lazy']}])
      })
    }
    test(`a descendant item still opens its ${run} code inside a div at depth ${depth}`, () => {
      const source = `${quote}- ::: box\n${quote}  - ${run}\n${quote}    x\n${quote}    ${run}\n${quote}  :::\n- tail\n`
      const document = parse(source)
      assert.equal(document.blocks.length, 2)
      let owner = document.blocks[0]
      for (let n = 0; n < depth; n++) owner = owner.children[0]
      assert.deepEqual(owner.items[0].blocks[0].children[0].items[0].blocks, [{t: 'code', lang: '', title: null, text: 'x\n'}])
      assert.deepEqual(document.blocks[1], parse('- tail\n').blocks[0])
    })
    test(`a descendant item still opens a paired ${run} line-block span inside a div at depth ${depth}`, () => {
      const source = `${quote}- ::: box\n${quote}  - ::: |\n${quote}    ${run}\n${quote}    :::\n${quote}    ${run}\n${quote}    :::\n${quote}    :::bad\n${quote}    :::\n- tail\n`
      const document = parse(source)
      assert.equal(document.blocks.length, 1)
      let owner = document.blocks[0]
      for (let n = 0; n < depth; n++) owner = owner.children[0]
      assert.deepEqual(owner.items[0].blocks[0].children[0].items[0].blocks, [{t: 'line-block', lines: [run, ':::', run]}, {t: 'para', lines: [':::bad', ':::', '- tail']}])
    })
  }
  test(`shifted line-block text needs no blank to remain a div paragraph at depth ${depth}`, () => {
    const source = `${quote}- b\n${quote}  ::: box\n${quote}    ::: |\n${quote}    \`\`\`\n${quote}  :::\n${quote}  para\n${quote}  \`\`\`\nlazy\n`
    const document = parse(source)
    assert.equal(document.blocks.length, 1)
    let owner = document.blocks[0]
    for (let n = 0; n < depth; n++) owner = owner.children[0]
    assert.deepEqual(owner.items[0].blocks.at(-1), {t: 'para', lines: ['para', '```', 'lazy']})
  })
}
