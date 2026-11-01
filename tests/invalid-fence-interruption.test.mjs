import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { carveToHtml } from '@markup-carve/carve'

const invalidInfo = [
  'raw,html', 'js,title="x"', 'php,{.x}', 'php,[tab] "title"', '\tjs', '  js',
  '=html "title"', '=html [label]', '=html ""', '=html []', '=', '=text/html', 'js=html',
  '"title"[label]', '  "title"', '  [label]',
]
for (const run of ['```', '~~~']) for (const info of invalidInfo) {
  for (const depth of [1, 2, 4]) test(`invalid ${JSON.stringify(run + info)} stays in a quote at depth ${depth}`, () => {
    const lines = ['lead', run + info, 'payload', 'tail']
    const source = '> '.repeat(depth) + lines.join('\n') + '\n'
    let expected = { t: 'para', lines }
    for (let i = 0; i < depth; i++) expected = { t: 'quote', children: [expected] }
    assert.deepEqual(parse(source).blocks, [expected])
    assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
  })
  for (const host of ['| h |', '![a](u)']) test(`invalid ${JSON.stringify(run + info)} continues ${host}'s caption`, () => {
    const tail = ['cap', run + info, 'payload', 'tail']
    const source = [host, '^ ' + tail[0], ...tail.slice(1)].join('\n') + '\n'
    const blocks = parse(source).blocks
    assert.equal(blocks.length, 1, 'the invalid fence must not become a sibling paragraph')
    assert.equal(host[0] === '|' ? blocks[0].caption : blocks[0].captionSlot.text, tail.join('\n'))
    assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
  })
}

for (const run of ['```', '~~~']) test(`a valid matched ${run} still ends a quoted paragraph`, () => {
  const source = ['> lead', run + 'js', 'payload', run, 'tail'].join('\n') + '\n'
  assert.deepEqual(parse(source).blocks, [
    { t: 'quote', children: [{ t: 'para', lines: ['lead'] }] },
    { t: 'code', lang: 'js', title: null, text: 'payload\n' },
    { t: 'para', lines: ['tail'] },
  ])
  assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
})

// An unmatched valid opener interrupts too and runs to the end (carve#4018).
for (const run of ['```', '~~~']) test(`a valid unmatched ${run} ends a quoted paragraph`, () => {
  const source = ['> lead', run + 'js', 'payload', 'tail'].join('\n') + '\n'
  assert.deepEqual(parse(source).blocks, [
    { t: 'quote', children: [{ t: 'para', lines: ['lead'] }] },
    { t: 'code', lang: 'js', title: null, text: 'payload\ntail\n' },
  ])
})

for (const run of ['```', '~~~']) for (const host of ['| h |', '![a](u)']) {
  test(`a valid matched ${run} ends ${host}'s caption`, () => {
    const source = [host, '^ cap', run + 'js', 'payload', run, 'tail'].join('\n') + '\n'
    const blocks = parse(source).blocks
    assert.equal(blocks.length, 3)
    assert.equal(host[0] === '|' ? blocks[0].caption : blocks[0].captionSlot.text, 'cap')
    assert.deepEqual(blocks[1], { t: 'code', lang: 'js', title: null, text: 'payload\n' })
    assert.deepEqual(blocks[2], { t: 'para', lines: ['tail'] })
    assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
  })
  test(`a valid unmatched ${run} ends ${host}'s caption`, () => {
    const source = [host, '^ cap', run + 'js', 'payload', 'tail'].join('\n') + '\n'
    const blocks = parse(source).blocks
    assert.equal(blocks.length, 2)
    assert.equal(host[0] === '|' ? blocks[0].caption : blocks[0].captionSlot.text, 'cap')
    assert.deepEqual(blocks[1], { t: 'code', lang: 'js', title: null, text: 'payload\ntail\n' })
  })
}

for (const run of ['```', '~~~']) for (const info of invalidInfo) {
  test(`invalid ${JSON.stringify(run + info)} is inline at document block start`, () => {
    const lines = [run + info, 'payload', 'tail']
    const source = lines.join('\n') + '\n'
    assert.deepEqual(parse(source).blocks, [{ t: 'para', lines }])
    assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
  })
}

for (const run of ['```', '~~~']) for (const format of ['html', 'latex', 'custom-1']) {
  for (const closed of [false, true]) test(`valid ${run}=${format}, closed ${closed}, keeps a raw block`, () => {
    const source = [run + '=' + format, 'payload', ...(closed ? [run] : [])].join('\n') + '\n'
    assert.deepEqual(parse(source).blocks, [{ t: 'raw', format, text: 'payload\n' }])
    assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
  })
}

for (const run of ['```', '~~~']) test(`valid ${run} metadata retains its title and label`, () => {
  const source = [run + 'text/html "title" [tab]', 'payload', run].join('\n') + '\n'
  assert.deepEqual(parse(source).blocks, [
    { t: 'code', lang: 'text/html', title: 'title', text: 'payload\n' },
  ])
  assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
})

for (const run of ['```', '~~~']) for (const info of ['raw,html', '=html "title"']) {
  for (const comment of [' %% hidden', ' %%%\n hidden\n %%%']) {
    const lines = [run + info, 'payload']
    const tail = { t: 'para', lines }
    const tailHtml = () => carveToHtml(lines.join('\n') + '\n').trim()
    test(`invalid ${JSON.stringify(run + info)} leaves an item after ${JSON.stringify(comment)}`, () => {
      const source = ['- lead', comment, ...lines].join('\n') + '\n'
      assert.deepEqual(parse(source).blocks, [{
        t: 'list', task: false, bullet: '-', ord: null, tight: true,
        items: [{ blocks: [{ t: 'para', lines: ['lead'] }] }],
      }, tail])
      assert.equal(renderDoc(parse(source)).trim(), '<ul>\n  <li>lead</li>\n</ul>\n' + tailHtml())
    })
    test(`invalid ${JSON.stringify(run + info)} leaves a description after ${JSON.stringify(comment)}`, () => {
      const source = [':: t', ': lead', comment, ...lines].join('\n') + '\n'
      assert.deepEqual(parse(source).blocks, [{
        t: 'deflist', items: [{ dt: 't' }, { ddBlocks: [{ t: 'para', lines: ['lead'] }] }],
      }, tail])
      assert.equal(renderDoc(parse(source)).trim(),
        '<dl>\n  <dt>t</dt>\n  <dd>lead</dd>\n</dl>\n' + tailHtml())
    })
    test(`invalid ${JSON.stringify(run + info)} leaves a note after ${JSON.stringify(comment)}`, () => {
      const source = ['[^n]: lead', comment, ...lines].join('\n') + '\n'
      const doc = parse(source)
      assert.deepEqual(doc.footnoteDefs.get('n'), [{ t: 'para', lines: ['lead'] }])
      assert.deepEqual(doc.blocks, [tail])
    })
  }
}

for (const run of ['```', '~~~']) for (const { info, lang, title } of [
  { info: '"title"', lang: '', title: 'title' },
  { info: '[tab]', lang: '', title: null },
  { info: 'js [tab]', lang: 'js', title: null },
  { info: 'js "title"', lang: 'js', title: 'title' },
  { info: '"title" [tab]', lang: '', title: 'title' },
  { info: '"" [tab]', lang: '', title: '' },
]) test(`valid metadata ${JSON.stringify(run + info)} keeps its slots`, () => {
  const source = [run + info, 'payload', run].join('\n') + '\n'
  assert.deepEqual(parse(source).blocks, [{ t: 'code', lang, title, text: 'payload\n' }])
  assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
})
