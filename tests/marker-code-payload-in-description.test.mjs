import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

const payload = '[r]: /inside\n[^a]: inside\n'
const leaves = node => {
  if (Array.isArray(node)) return node.flatMap(leaves)
  if (!node || typeof node !== 'object') return []
  return [...(['code', 'raw'].includes(node.t) ? [node] : []), ...Object.values(node).flatMap(leaves)]
}

for (const [marker, width] of [['-', 2], ['1.', 3], ['- [ ]', 2], ['- -', 4]]) {
  for (const [opener, closer, kind] of [['```', '```', 'code'], ['~~~~ js', '~~~~~', 'code'], ['```=html', '```', 'raw']]) {
    for (const depth of [0, 1, 2]) {
      for (const noteHost of [false, true]) {
        test(`keeps literal definitions in ${marker} ${opener}, quote depth ${depth}, note host ${noteHost}`, () => {
          const margin = ' '.repeat(2 + width)
          let lines = [':: term', `: ${marker} ${opener}`, `${margin}[r]: /inside`, `${margin}[^a]: inside`, `${margin}${closer}`]
          if (noteHost) lines = ['[^outer]: start', '', ...lines.map(line => '  ' + line)]
          const prefix = '> '.repeat(depth)
          const source = lines.map(line => prefix + line).join('\n') + '\n'
          const ast = parse(source)
          const blocks = [...ast.blocks, ...[...ast.footnoteDefs.values()].flat()]
          const code = leaves(blocks)
          assert.deepEqual(code.map(node => node.t), [kind])
          assert.ok(code[0].text.startsWith(payload))
          if (!noteHost) assert.equal(code[0].text, payload)
          assert.equal(ast.linkDefs.has('r'), false)
          assert.equal(ast.footnoteDefs.has('a'), false)
          const withOutside = parse(source + prefix + '[r]: /outside\n' + prefix + '[^a]: outside\n')
          assert.equal(withOutside.linkDefs.get('r')?.url, '/outside')
          assert.deepEqual(withOutside.footnoteDefs.get('a'), [{ t: 'para', lines: ['outside'] }])
        })
      }
    }
  }
}

for (const priorParagraph of [false, true]) {
  for (const ending of ['sibling', 'above-floor closer', 'second fence']) {
    for (const opener of ['```', '~~~ js', '```=html']) {
      for (const noteHost of [false]) {
        test(`ends marker payload at ${ending}, ${opener}, prior paragraph ${priorParagraph}, note host ${noteHost}`, () => {
          const closer = opener.startsWith('~') ? '~~~' : '```'
          const body = priorParagraph ? ['- before'] : []
          body.push(`- ${opener}`, '  [r]: /inside', '  [^a]: inside')
          if (ending === 'above-floor closer') body.push(`   ${closer}`)
          if (ending === 'second fence') body.push(`- ${opener}`, '  [q]: /second', `  ${closer}`)
          else body.push('- after', '  tail')
          body.push(' [s]: /outside')
          let lines = [':: term', ...body.map((line, i) => (i === 0 ? ': ' : '  ') + line)]
          if (noteHost) lines = ['[^outer]: start', '', ...lines.map(line => '  ' + line)]
          const ast = parse(lines.join('\n') + '\n')
          const code = leaves([...ast.blocks, ...[...ast.footnoteDefs.values()].flat()])
          assert.equal(code.length, ending === 'second fence' ? 2 : 1)
          assert.ok(code[0].text.startsWith(payload))
          assert.equal(ast.linkDefs.has('r'), false)
          assert.equal(ast.footnoteDefs.has('a'), false)
          assert.equal(ast.linkDefs.has('q'), false)
          assert.equal(ast.linkDefs.get('s')?.url, '/outside')
        })
      }
    }
  }
}


test('does not treat a marker-shaped paragraph as an opaque list fence', () => {
  const source = ':: term\n: para\n  - [ ] ~~~\n        ``` js\n       [r]: /in\n  +\n     [s]: /s\n'
  const ast = parse(source)
  assert.equal(leaves(ast.blocks).length, 0)
  // A definition past the body's column registers there (CARVE-P0-020, carve#3279).
  assert.deepEqual(ast.blocks[0].items[1].ddBlocks, [{ t: 'para', lines: ['para', '- [ ] ~~~', '``` js'] }, { t: 'para', lines: ['+'] }])
  assert.deepEqual([...ast.linkDefs.keys()], ['r', 's'])
})

test('keeps a below-authored-base definition outside the measured marker fence', () => {
  const ast = parse(':: term\n: %% comment\n        %% comment\n        1. ```\n     [r]: /in\n')
  assert.equal(leaves(ast.blocks)[0].text, '')
  assert.equal(ast.linkDefs.get('r')?.url, '/in')
})

test('a definition past a nested container after empty CODE opens on its authored base', () => {
  const ast = parse(':: term\n: - ```\n    ```\n      :::\n     [r]: /in\n')
  assert.equal(leaves(ast.blocks)[0].text, '')
  assert.equal(ast.linkDefs.get('r')?.url, '/in')
  const containers = ast.blocks[0].items[1].ddBlocks[0].items[0].blocks
  assert.deepEqual(containers[1].children, [])
})

test('measuring marker CODE preserves literal rows without changing the unrebased reader', () => {
  const source = ':: term\n: - - ```\n      [r]: /in\n [s]: /o\n'
  const ast = parse(source)
  assert.equal(leaves(ast.blocks)[0].text, '[r]: /in\n')
  assert.deepEqual(ast.blocks, parse(source, { authoredBodyBases: false }).blocks)
  assert.deepEqual([...ast.linkDefs.keys()], ['s'])
})

test('literal definition payload measurement has a linear counted work bound', () => {
  for (const count of [100, 200, 400]) {
    const source = ':: t\n: - ```\n' + Array.from({ length: count }, (_, i) => '    [r' + i + ']: /u').join('\n') + '\n    ```\n'
    resetLayoutWork()
    const ast = parse(source)
    assert.equal(ast.linkDefs.size, 0)
    assert.equal(leaves(ast.blocks)[0].text.split('\n').length - 1, count)
    assert.ok(layoutWork.lineVisits <= 8 * (count + 4))
    assert.ok(layoutWork.scan <= 4 * source.length)
  }
})


for (const [name, body] of [
  ['nested', ['- +', '  - FENCE', '    [r]: /in', '    ```', ' [s]: /outside']],
  ['sibling', ['- +', '- FENCE', '  [r]: /in', '  ```', ' [s]: /outside']],
  ['nested empty item', ['- - +', '  - FENCE', '    [r]: /in', '    ```', '   [s]: /outside']],
]) {
  for (const raw of [false, true]) {
    for (const quoted of [false, true]) {
      test(`retains unclosed marker payload after ${name}, raw ${raw}, quoted ${quoted}`, () => {
        const lines = body.slice(0, 3)
        lines.push(lines[2].replace('[r]: /in', '[^a]: in'))
        const prefix = quoted ? '> ' : ''
        const source = [':: term', ...lines.map((line, i) => (i === 0 ? ': ' : '  ') + line.replace('FENCE', raw ? '```=html' : '```'))]
          .map(line => prefix + line).join('\n') + '\n'
        const ast = parse(source)
        assert.deepEqual(leaves(ast.blocks).map(node => [node.t, node.text]), [[raw ? 'raw' : 'code', '[r]: /in\n[^a]: in\n']])
        assert.equal(ast.linkDefs.size, 0)
        assert.equal(ast.footnoteDefs.size, 0)
      })
      test(`retains source row origins after ${name}, raw ${raw}, quoted ${quoted}`, () => {
        const prefix = quoted ? '> ' : ''
        const source = [':: term', ...body.map((line, i) => (i === 0 ? ': ' : '  ') + line.replace('FENCE', raw ? '```=html' : '```'))]
          .map(line => prefix + line).join('\n') + '\n'
        const ast = parse(source)
        assert.deepEqual(leaves(ast.blocks).map(node => [node.t, node.text]), [[raw ? 'raw' : 'code', '[r]: /in\n']])
        assert.equal(ast.linkDefs.has('r'), false)
        assert.equal(ast.linkDefs.get('s')?.url, '/outside')
      })
    }
  }
}
