import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const nodes = value => {
  if (!value || typeof value !== 'object') return []
  return (value.t ? [value] : []).concat(Object.values(value).flatMap(nodes))
}

for (const prefix of ['', '> ', '> > ']) {
  for (const column of [4, 6]) {
    for (const run of ['```', '~~~']) {
      for (const nestedDefinition of [false, true]) {
        test(`a content-column div ends the term: ${prefix}, ${column}, ${run}, ${nestedDefinition}`, () => {
          const inner = nestedDefinition ? ['  :: inner', '  : desc'] : ['  inside']
          const source = ['- :: term', '  ::: box', ...inner, '  :::',
            `${' '.repeat(column)}${run}`, `${' '.repeat(column)}code`,
            `${' '.repeat(column)}${run}`].map(line => prefix + line).join('\n') + '\n'
          const all = nodes(parse(source).blocks)
          assert.deepEqual(all.filter(node => node.t === 'code').map(node => node.text), ['code\n'])
          assert.equal(all.filter(node => node.t === 'colon-div').length, 1)
        })
      }
    }
  }
  for (const info of [' bad info', '  js', '\tjs']) {
    test(`invalid CODE info remains term text: ${prefix}, ${JSON.stringify(info)}`, () => {
      const source = ['- :: term', '  ```' + info, '  a', '', '- next']
        .map(line => line ? prefix + line : '').join('\n') + '\n'
      const html = renderDoc(parse(source))
      assert.match(html, /<dt>term\n<code>/)
      assert.doesNotMatch(html, /<pre>/)
    })
  }
  for (const info of ['', 'js', '=html']) {
    test(`valid CODE info ends the term: ${prefix}, ${info}`, () => {
      const source = ['- :: term', '  ```' + info, '  a', '  ```']
        .map(line => prefix + line).join('\n') + '\n'
      const all = nodes(parse(source).blocks)
      assert.equal(all.filter(node => node.t === (info === '=html' ? 'raw' : 'code')).length, 1)
    })
  }
  test(`a div past the term column ends the term: ${prefix}`, () => {
    const source = ['- :: term', '    ::: box', '    inside', '    :::']
      .map(line => prefix + line).join('\n') + '\n'
    const all = nodes(parse(source).blocks)
    assert.equal(all.filter(node => node.t === 'colon-div').length, 1)
    assert.match(renderDoc(parse(source)), /<dt>term<\/dt>/)
  })
}

for (const run of ['```', '~~~']) {
  for (const info of [' bad info', '  js', '\tjs']) {
    test(`top-level invalid info folds into the term: ${run}, ${JSON.stringify(info)}`, () => {
      const document = parse(`:: term\n${run}${info}\na\n`)
      assert.equal(document.blocks.length, 1)
      assert.equal(document.blocks[0].t, 'deflist')
      assert.equal(document.blocks[0].items[0].dt, `term\n${run}${info}\na`)
    })
  }
  test(`a CODE opener past the term column ends the term: ${run}`, () => {
    const document = parse(`- :: term\n    ${run}\n    code\n    ${run}\n`)
    const all = nodes(document.blocks)
    assert.equal(all.filter(node => node.t === 'code').length, 1)
    assert.equal(all.find(node => node.t === 'deflist').items[0].dt,
      'term')
  })
}

test('a div at the top-level term column ends the term', () => {
  const document = parse(':: term\n::: box\ninside\n:::\n')
  assert.equal(document.blocks[0].items[0].dt, 'term')
  assert.equal(document.blocks[1].t, 'colon-div')
})

for (const [marker, ends] of [['abc.', false], ['1.', true], ['a.', true], ['iv.', true]]) {
  test(`an ordered marker ends a term only when a dialect claims it: ${marker}`, () => {
    const html = renderDoc(parse(`:: term\n${marker} item\n`))
    if (ends) assert.match(html, /<dt>term<\/dt>/)
    else assert.match(html, new RegExp(`<dt>term\\n${marker.replace('.', '\\.')} item</dt>`))
  })
}
