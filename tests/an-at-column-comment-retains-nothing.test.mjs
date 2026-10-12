import test from 'node:test'
import assert from 'node:assert/strict'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))
const leaf = blocks => {
  const node = blocks[0]
  if (node.t === 'quote') return leaf(node.children)
  if (node.t === 'list') {
    const children = node.items[0].blocks
    const nested = children.find(block => block.t === 'list' || block.t === 'deflist')
    return nested ? leaf([nested]) : children
  }
  return node.items.find(item => item.ddBlocks).ddBlocks
}

for (const depth of [0, 1, 2]) for (const nested of [0, 1, 2]) {
  for (const host of ['item', 'description']) for (const kind of ['line', 'fenced']) {
    for (const offset of [-1, 0, 1]) {
      test(`${host}, ${kind}, quote depth ${depth}, item depth ${nested}, comment offset ${offset}`, () => {
        const base = nested * 2
        const column = base + (host === 'item' ? 2 : 3)
        const pad = ' '.repeat(column + offset)
        const comment = kind === 'line' ? [pad + '%% c'] : [pad + '%%%', pad + 'HIDDEN', pad + '%%%']
        const parents = Array.from({length: nested}, (_, n) => ' '.repeat(n * 2) + '- outer')
        const head = host === 'item' ? [' '.repeat(base) + '- HEAD'] : [' '.repeat(base) + ':: term', ' '.repeat(base) + ':  HEAD']
        const source = [...parents, ...head, ...comment, ' '.repeat(column - 1) + 'FOLLOW']
          .map(line => '> '.repeat(depth) + line).join('\n') + '\n'
        const body = leaf(parse(source).blocks)
        // A matched span in the ancestor's body belongs to that ancestor (CARVE-P9-053).
        const retained = offset === -1 && !(host === 'item' && kind === 'fenced' && nested > 0)
        assert.equal(JSON.stringify(body).includes('FOLLOW'), retained, html(source))
        assert.ok(html(source).includes('FOLLOW'), html(source))
        assert.ok(!html(source).includes('HIDDEN'), html(source))
      })
    }
  }
}

for (const comment of [['>     %% c'], ['>     %%%', '>     hidden', '>     %%%']]) {
  test(`#3004 releases text from inner after ${comment.length === 1 ? 'line' : 'fenced'} comment`, () => {
    const source = ['> - ::: box', '>   - ::: inner', ...comment, '>    text', 'tail'].join('\n') + '\n'
    const box = parse(source).blocks[0].children[0].items[0].blocks[0]
    assert.deepEqual(box.children[0].items[0].blocks[0].children, [])
    assert.deepEqual(box.children[1], {t: 'para', lines: ['text', 'tail']})
    assert.match(html(source), /<p>text\ntail<\/p>/)
  })
}

for (const kind of ['%% c', '%%%\n  hidden\n  %%%']) {
  test(`a note at its body column releases the follower: ${kind}`, () => {
    const source = `[^n]: HEAD\n  ${kind}\n FOLLOW\n\n[^n]\n`
    const out = html(source)
    assert.match(out, /^<p>FOLLOW<\/p>/)
    assert.ok(!out.slice(out.indexOf('<section')).includes('FOLLOW'), out)
  })
}

for (const depth of [0, 1, 2]) for (const column of [2, 3]) {
  for (const closer of [0, 1, 2, 3]) {
    test(`an at/past-column span cannot gain retention from its closer: depth ${depth}, opener ${column}, closer ${closer}`, () => {
      const source = ['- HEAD', ' '.repeat(column) + '%%%', '  HIDDEN', ' '.repeat(closer) + '%%%', ' FOLLOW']
        .map(line => '> '.repeat(depth) + line).join('\n') + '\n'
      assert.deepEqual(leaf(parse(source).blocks), [{t: 'para', lines: ['HEAD']}], html(source))
    })
  }
  for (const kind of ['%% c', '%%%\n  hidden\n  %%%']) {
    test(`an at/past-column comment clears an earlier low comment: depth ${depth}, column ${column}, ${kind}`, () => {
      const source = ['- HEAD', ' %% low', ' '.repeat(column) + kind, ' FOLLOW']
        .join('\n').split('\n').map(line => '> '.repeat(depth) + line).join('\n') + '\n'
      assert.deepEqual(leaf(parse(source).blocks), [{t: 'para', lines: ['HEAD']}], html(source))
    })
  }
}

for (const depth of [0, 1, 2]) for (const nested of [1, 2]) {
  test(`a span below every item column preserves the child paragraph: depth ${depth}, item depth ${nested}`, () => {
    const parents = Array.from({length: nested}, (_, n) => ' '.repeat(n * 2) + '- outer')
    const source = [...parents, ' '.repeat(nested * 2) + '- HEAD', ' %%%', ' HIDDEN', ' %%%', ' '.repeat(nested * 2 + 1) + 'FOLLOW']
      .map(line => '> '.repeat(depth) + line).join('\n') + '\n'
    assert.ok(JSON.stringify(leaf(parse(source).blocks)).includes('FOLLOW'), html(source))
    assert.ok(!html(source).includes('HIDDEN'), html(source))
  })
}
