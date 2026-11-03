import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a closer below a nested item\'s column ends only the line block\'s span (carve#5011)', () => {
  assert.equal(html('- - ::: |\n    %%%\n   %%%\n    w\n'), [
    '<ul>', '  <li>', '    <ul>', '      <li>', '        <div class="line-block">',
    '          <p>w</p>', '        </div>', '      </li>', '    </ul>', '  </li>', '</ul>',
  ].join('\n'))
  assert.equal(html('- - ::: |\n    %%%\n   %%%\n  q\nz\n'), [
    '<ul>', '  <li>', '    <ul>', '      <li>', '        <div class="line-block">', '', '        </div>',
    '      </li>', '    </ul>', '    q', 'z', '  </li>', '</ul>',
  ].join('\n'))
})

// PART 9 §28: the closer's column does not matter, the span ends wherever it pairs.
test('a nested line block\'s closer reads alike at every column of the outer item', () => {
  const hosts = [['- - ', 4], ['- a\n  - ', 4], ['- 1. ', 5], ['> - - ', 4, '> ']]
  let checked = 0
  for (const [first, col, pre = ''] of hosts) for (const run of ['%%%', '%%%%']) for (let at = 2; at < col; at++) {
    for (const tail of [' '.repeat(col) + 'w', '  q\nz', 'z', '- b']) {
      const P = (s) => s.split('\n').map((l) => pre + l).join('\n')
      const doc = (closer) => [first + '::: |', P(' '.repeat(col) + run), P(closer), P(tail)].join('\n') + '\n'
      assert.equal(html(doc(' '.repeat(at) + run)), html(doc(' '.repeat(col) + run)), JSON.stringify(doc(' '.repeat(at) + run)))
      checked++
    }
  }
  assert.equal(checked, 72)
})

test('closers below a nested line block\'s column cost linear layout work', () => {
  const work = (n) => {
    resetLayoutWork()
    parse('- - ::: |\n' + Array.from({ length: n }, (_, k) => k % 2 ? '   %%%\n' : '    %%%\n').join('') + '    w\n')
    return layoutWork.scan + layoutWork.views
  }
  assert.ok(work(2000) < 2.5 * work(1000))
})

test('a line that ends a quoted item\'s line-block span leaves a paragraph a marker folds into (carve#5010)', () => {
  const expected = [
    '<blockquote>', '  <ul>', '    <li>', '      <div class="line-block">', '', '      </div>', '    </li>', '  </ul>',
    '  <p>c', '- tail</p>', '</blockquote>',
  ].join('\n')
  assert.equal(html('> - ::: |\n>   %%%\n> c\n- tail\n'), expected)
  assert.equal(html('> - ::: |\n>   %%%\n>   :::\n>   :::bad\n> c\n- tail\n'), expected)
  // With verse in the stanza, `c` folds into it and `- tail` opens a list.
  assert.match(html('> - ::: |\n>   x\n>   %%%\n> c\n- tail\n'), /<\/blockquote>\n<ul>\n  <li>tail<\/li>/)
})
