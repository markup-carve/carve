import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P0-009: a below-column line continues a paragraph only where one is
// open at the deepest frame. Otherwise it closes the list and begins a new
// block, and no surviving frame adopts it.
const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')
const quoted = (depth, lines) => lines.map((line) => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\n'
// The tail as a document block: after every container, never inside one.
const outside = (out, depth) => (depth > 0
  ? /<\/blockquote>(<p>TAIL<\/p>|<ol><li>TAIL<\/li><\/ol>)$/
  : /<\/ul>(<p>TAIL<\/p>|<ol><li>TAIL<\/li><\/ol>)$/).test(out)

const between = { none: [], hr: ['  ---'], heading: ['  # h'], table: ['  | t |'], comment: ['  %% c'], attrs: ['  {.x}'], div: ['  ::: d', '  :::'] }
// The lead is a fence run that opens nothing: its info string is invalid (carve#4018).
for (const depth of [0, 1, 2]) for (const lead of ['    ```js,title="x"', '  ```js,title="x"', '    ~~~~js,title="x"']) for (const blank of [false, true]) {
  for (const [name, mid] of Object.entries(between)) for (const tail of ['TAIL', '1. TAIL']) {
    const fence = lead.includes('~') ? '```' : '~~~'
    const body = ['- a', lead, ...(blank ? [''] : []), ...mid, '  ' + fence, '  code', '  ' + fence]
    test(`no paragraph resumes after a closed block under a failed opener: depth ${depth}, ${JSON.stringify(lead)}, blank ${blank}, ${name}, ${tail}`, () => {
      assert.ok(outside(html(quoted(depth, body) + tail + '\n'), depth))
    })
    // A marker at document column 0 opens a list beside an unquoted one, so
    // only the quoted spellings fold it.
    if (tail === 'TAIL' || depth > 0) test(`an open paragraph after that block still takes the line: depth ${depth}, ${JSON.stringify(lead)}, blank ${blank}, ${name}, ${tail}`, () => {
      const out = html(quoted(depth, [...body, '  more']) + tail + '\n')
      assert.match(out, /more\n?(1\. )?TAIL<\/li><\/ul>/)
    })
  }
}

for (const depth of [1, 2]) for (const first of [null, '  - a', '    - a']) for (const column of [2, 4, 6, 8]) for (const blank of [false, true]) {
  for (const last of [[':::'], ['::: box'], ['::: box', ':::'], ['~~~', 'x', '~~~']]) for (const tail of ['TAIL', '1. TAIL']) {
    const lines = [...(first ? [first] : []), '- b', '    - c', ...(blank ? [''] : []), ...last.map((line) => ' '.repeat(column) + line)]
    test(`a closed block in a quoted nested item releases the line: depth ${depth}, first ${first}, column ${column}, blank ${blank}, ${last[0]}, ${tail}`, () => {
      const source = quoted(depth, lines) + tail + '\n'
      assert.ok(outside(html(source), depth))
      // An unrelated earlier list does not change who owns the tail.
      if (first) assert.equal(outside(html(quoted(depth, lines.slice(1)) + tail + '\n'), depth), true)
    })
  }
}

for (const depth of [1, 2]) for (const block of ['# h', '---', '| t |', '[r]: /u', '{.x}']) {
  test(`a block at a quoted item's content column leaves the quote no paragraph: depth ${depth}, ${block}`, () => {
    assert.ok(outside(html(quoted(depth, ['- a', '  ' + block]) + 'TAIL\n'), depth))
    assert.ok(outside(html(quoted(depth, ['- a', '  - b', '    ' + block]) + 'TAIL\n'), depth))
  })
}

for (const last of ['> # h', '> ---', '> | t |', '> - # h', '> > # h']) {
  test(`a quote in an item answers with its last block: ${last}`, () => {
    assert.ok(outside(html(`- a\n  ${last}\nTAIL\n`), 0))
    // Under quoted prose a marker is that prose (§10 I2), so only an interrupter answers there.
    if (!last.startsWith('> - ')) assert.ok(outside(html(`- a\n  > q\n  ${last}\nTAIL\n`), 0))
  })
}
test('a quote in an item that ends in prose still takes the line', () => {
  assert.match(html('- a\n  > # h\n  > q\nTAIL\n'), /<p>q\n?TAIL<\/p><\/blockquote><\/li>/)
  assert.match(html('- a\n  > q\n  > - # h\nTAIL\n'), /TAIL<\/p><\/blockquote><\/li>/)
})

for (const fence of ['```', '~~~~']) for (const marker of ['-', '1.']) {
  test(`a fence on a sublist's marker line is a closed block: ${marker} ${fence}`, () => {
    const pad = ' '.repeat(2 + marker.length + 1)
    assert.ok(outside(html(`- a\n  ${marker} ${fence}\n${pad}x\n${pad}${fence}\nTAIL\n`), 0))
    // Unclosed, its body is verbatim and the line still leaves (CARVE-P0-013).
    assert.ok(outside(html(`- a\n  ${marker} ${fence}\n${pad}x\nTAIL\n`), 0))
  })
}

const separators = { none: [], blank: [''], comment: ['      %% c'], blankComment: ['', '      %% c'], text: ['      more'], heading: ['      # h'] }
for (const depth of [0, 1, 2]) for (const child of [false, true]) for (const c2 of [false, true]) for (const blocks of [1, 2, 3]) {
  for (const [name, separator] of Object.entries(blocks === 1 ? { none: [] } : separators)) for (const tail of ['TAIL', '1. TAIL']) {
    const lines = ['- [^a]: text', ...(child ? ['    - child'] : []), '    [^b]: inner', ...(c2 ? ['      - c2'] : [])]
    for (let k = 0; k < blocks; k++) lines.push(...(k ? separator : []), '      ~~~', '      c' + k, '      ~~~')
    test(`a line after a nested note's code block leaves the list: depth ${depth}, child ${child}, c2 ${c2}, ${blocks} blocks, ${name}, ${tail}`, () => {
      const out = html(quoted(depth, lines) + tail + '\n\n[^a] [^b]\n').replace(/<p><a id="fnref.*$/, '')
      assert.ok(outside(out, depth))
    })
  }
}

for (const depth of [0, 1, 2]) for (const opener of ['::: inner', ':::', ':::: w']) for (const comment of [[' %% c'], ['%% c'], [' %%% c'], [' %%%', ' hidden', ' %%%']]) {
  const closer = '  ' + opener.match(/^:+/)[0]
  test(`a marker-line opener before a below-column comment matches its closed twin: depth ${depth}, ${opener}, ${comment[0]}`, () => {
    const source = quoted(depth, ['- ' + opener, ...comment, ' text'])
    const twin = quoted(depth, ['- ' + opener, closer, ...comment, ' text'])
    assert.deepEqual(parse(source).blocks, parse(twin).blocks)
    assert.match(html(source), /<div[^>]*>/)
  })
  test(`a content-column line after a comment enters the open marker-line container: depth ${depth}, ${opener}, ${comment[0]}`, () => {
    const source = parse(quoted(depth, ['- ' + opener, ...comment, '  text']))
    const twin = parse(quoted(depth, ['- ' + opener, closer, ...comment, '  text']))
    const blocksAt = doc => {
      let blocks = doc.blocks
      for (let k = 0; k < depth; k++) blocks = blocks[0].children
      return blocks[0].items[0].blocks
    }
    const openBlocks = blocksAt(source)
    const closedBlocks = blocksAt(twin)
    assert.deepEqual(openBlocks[0].children, closedBlocks.slice(1))
    const moved = structuredClone(source.blocks)
    const movedBlocks = blocksAt({ blocks: moved })
    movedBlocks.push(...movedBlocks[0].children)
    movedBlocks[0].children = []
    assert.deepEqual(moved, twin.blocks)
  })
}

for (const depth of [0, 1, 2]) for (const head of ['::: box', 'a', '# h', '- n']) for (const at of [2, 1, 4]) {
  for (const second of ['%% j', '%%%', '%%%%%%', null]) for (const secondAt of [0, 1]) for (const tailAt of [2, 0, 1]) {
    test(`an unmatched comment fence owns what a line comment owns: depth ${depth}, ${head}, column ${at}, ${second}@${secondAt}, tail ${tailAt}`, () => {
      const read = (first) => html(quoted(depth, ['- ' + head, ' '.repeat(at) + first,
        ...(second ? [' '.repeat(secondAt) + second] : []), ' '.repeat(tailAt) + 'TAIL']))
      const line = read('%% k')
      assert.equal(read('%%%%'), line)
      assert.equal(read('%%%%%'), line)
      // `%%% k` pairs with a following `%%%`, which makes it a span, not the line form.
      if (second !== '%%%') assert.equal(read('%%% k'), line)
    })
  }
}
