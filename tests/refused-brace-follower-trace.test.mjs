import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830: refused runs have no follower trace rule.
const html = source => renderDoc(parse(source))
const trace = source => modelTrace(source).map(({ line, owner, form }) => ({ line, owner, form }))
const check = source => {
  const escaped = source.replace('{', '\\{')
  assert.equal(html(source), html(escaped), source)
  assert.deepEqual(trace(source), trace(escaped), source)
}

for (const name of [
  '1010-a-refused-brace-run-keeps-its-follower-in-an-attached-note',
  '1011-an-unclosed-backtick-follower-stays-in-a-note-paragraph',
  '1012-a-later-fence-opener-ends-a-description-after-a-refused-run',
  '650-a-wrapped-attribute-line-interrupts-like-a-one-line-attribute-line-3',
  '821-an-attribute-run-after-a-lone-plus-leads-a-sublist-at-the-content-column-2',
]) test('corpus row follows the escaped-opener trace', () => {
  const source = readFileSync(new URL(`../tests/corpus/${name}.crv`, import.meta.url), 'utf8')
  check(source)
})

for (const source of [
  '- a\n{.x\n.y}\n# h\n',
  'ref [^x]\n\n[^x]: +\n{%x\ny%}\n::: note\nx\n:::\n',
  'ref [^a]\n\n[^a]: +\n{.x\n.y}\n~~~\ntext\n~~~\n',
  'ref [^a]\n\n[^a]: +\n{.x\n.y}\n```\ntext\n# h\n',
  ...['# h', '> q', '~~~\ntext\n~~~', '```\ntext', '~~~\ntext'].map(follower =>
    `ref [^a]\n\n[^a]: +\n{%x\ny%}\n${follower}\n`),
]) test('a later line keeps ordinary ownership', () => check(source))

test('1,188 attached follower variants follow the escaped-opener trace', () => {
  let count = 0
  for (const host of ['[^a]: +', ':: t\n: +', '- +', '1. +']) {
    for (const run of ['```', '````', '~~~', '~~~~']) {
      for (const payload of ['a', '  a', '# h', '> q', 'plain text']) {
        if (host === '[^a]: +' && (run.startsWith('~') || payload === '# h' || payload === '> q')) continue
        for (const tail of ['', '\n', '\nnext', '\n- next', '\n# next', '\n::: note\nbody\n:::']) {
          for (const brace of ['{.x\n.y}', '{#id\n.more}', '{key=one\ntwo}']) {
            const source = `${host}\n${brace}\n${run}\n${payload}\n${run}${tail}\n`
            check(source)
            count++
          }
        }
      }
    }
  }
  assert.equal(count, 1188)
})
