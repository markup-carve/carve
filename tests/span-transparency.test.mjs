import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('1,000 ordinary-container variants erase a line comment or one-line definition before layout', () => {
  const heads = ['a', '- a', '* a', '1. a', '> a', '> - a', ':: t\n: a', '::: note\na', '[^n]: a', '- > a']
  const invisible = ['%% c', '%% c\n%% d', '[r]: /u', '*[X]: x', '%% c\n[r]: /u']
  const followers = ['b', '  b', '> b', '- b', '# H', '\n b', '  - b', '::: note\nb', '| a |', 'x\n\ny']
  let checked = 0
  for (const head of heads) for (const line of invisible) for (const follower of followers) for (const pad of ['', ' ']) {
    const visible = `${head}\n${follower}\n`
    const authored = `${head}\n${pad}${line}\n${follower}\n`
    assert.equal(html(authored), html(visible), JSON.stringify(authored))
    checked++
  }
  assert.equal(checked, 1000)
})

test('erased definitions still register document-wide', () => {
  assert.match(html('a\n[r]: /u\nb [r][]\n'), /<a href="\/u">r<\/a>/)
  assert.match(html('a\n*[X]: expanded\nb X\n'), /<abbr title="expanded">X<\/abbr>/)
  assert.equal(html('a\n%% c\n- [r]: /u\nuse [r][]\n'), html('a\n- [r]: /u\nuse [r][]\n'))
  assert.match(html('[r]: /a\n- [r]: /b\nuse [r][]\n'), /href="\/b"/)
  assert.match(html('- [r]: /b\n[r]: /a\nuse [r][]\n'), /href="\/a"/)
  assert.match(html(`[r]: /a\n${'> '.repeat(17)}[r]: /b\nuse [r][]\n`), /href="\/b"/)
  assert.match(html('[r]: /a\n[^n]: [r]: /b\nuse [r][]\n'), /href="\/b"/)
  assert.match(html('*[A]: a\n[^n]: *[A]: b\nA\n'), /title="b"/)
  assert.match(html('*[X]: earlier\n- *[X]: later   \nX\n'), /title="later"/)
  assert.match(html('[r]: /a\n- [r]: /b   \nuse [r][]\n'), /href="\/b"/)
  for (const marker of ['- ', '* ', '1. ', '. ', '-{.x} ', '1.{.x} ', '- [ ] ', '- [-] ', '- [_] ', '- [>] ', '- [?] ', '> ', '[^n]: ']) {
    const later = `${marker}[r]: /b\nuse [r][]\n`
    assert.match(html(later), /href="\/b"/, marker)
    assert.equal(html(`[r]: /a\n${later}`), html(later), marker)
  }
})

test('an erased comment remains in the source trace at its authored line', () => {
  const trace = []
  parse('- a\n%% c\n  b\n', { trace })
  assert.ok(trace.some(record => record.line === 2 && record.form === 'comment' && record.rule === 'CARVE-P0-005'))
  const nested = []
  parse('- a\n  %% c\n  b\n', { trace: nested })
  assert.ok(nested.some(record => record.line === 2 && record.form === 'comment' && record.owner.startsWith('doc/item:1')))
  const reused = []
  parse('- a\n', { trace: reused })
  parse('%% c\n- b\n', { trace: reused })
  assert.deepEqual(reused.map(record => record.line), [1, 1, 2])
})

test('a quoted invisible line keeps its structural quote prefix', () => {
  assert.equal(html('> a\n> %% c\nb\n'), html('> a\n>\nb\n'))
  assert.equal(html('> a\n> [r]: /u\nb [r][]\n'), html('> a\n>\nb [r][]\n[r]: /u\n'))
  assert.equal(html('> a\n> %% c\n> b\n'), html('> a\n>\n> b\n'))
  const trace = []
  parse('> a\n> %% c\nb\n', { trace })
  assert.equal(trace.filter(record => record.line === 2).length, 1)
  assert.equal(trace.find(record => record.line === 2)?.form, 'comment')
})

test('a refused plus keeps its authored source index after erasure', () => {
  const stateSink = {}
  parse('%% c\n- +\n\ntext\n', { stateSink })
  assert.deepEqual(stateSink.refusedPlusLines, [1])
})

test('erasure does not move a later frontmatter-shaped block to the document start', () => {
  for (const first of ['%% c', '[r]: /u', '*[X]: expanded']) {
    const rest = '---\ntitle: Hi\n---\nBody\n'
    assert.equal(html(`${first}\n${rest}`), html(`text\n${rest}`).replace(/^<p>text<\/p>\n/, ''))
  }
})

test('a leading erased line does not relabel a later dash run as frontmatter', () => {
  const trace = []
  parse('%% c\n---\ntitle: Hi\n---\nBody\n', { trace })
  assert.ok(!trace.some(record => record.form === 'frontmatter'))
})

test('opaque payloads and block-level invisible constructs keep their own classification', () => {
  assert.notEqual(html('a\n%%% c\nb\n'), html('a\nb\n'))
  assert.notEqual(html('a\n[^n]: b\nc\n'), html('a\nc\n'))
  assert.notEqual(html('a\n{.x}\nb\n'), html('a\nb\n'))
  assert.match(html('```\n%% c\n```\n'), /<code>%% c\n<\/code>/)
})
