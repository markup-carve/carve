import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('corpus refused-run followers use the HTML paragraph owner', () => {
  for (const [name, line, owner] of [
    ['1010-a-refused-brace-run-keeps-its-follower-in-an-attached-note', 4, 'doc/footnote:1'],
    ['1011-an-unclosed-backtick-follower-stays-in-a-note-paragraph', 6, 'doc/footnote:3'],
    ['1012-a-later-fence-opener-ends-a-description-after-a-refused-run', 5, 'doc/dd:2'],
    ['650-a-wrapped-attribute-line-interrupts-like-a-one-line-attribute-line-3', 5, 'doc'],
    ['821-an-attribute-run-after-a-lone-plus-leads-a-sublist-at-the-content-column-2', 5, 'doc/item:1'],
  ]) {
    const source = readFileSync(new URL(`../tests/corpus/${name}.crv`, import.meta.url), 'utf8')
    const record = modelTrace(source)[line - 1]
    assert.equal(record.owner, owner, name)
    assert.ok(['lazy', 'text'].includes(record.form), name)
  }
})

test('a brace line lazily folded into an open item paragraph claims no following heading', () => {
  const source = '- a\n{.x\n.y}\n# h\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc')
  assert.equal(trace[3].form, 'leaf')
  assert.match(renderDoc(parse(source)), /<h1>h<\/h1>/)
})

test('a colon closer after an attached refused run stays in its note', () => {
  const source = 'ref [^x]\n\n[^x]: +\n{%x\ny%}\n::: note\nx\n:::\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li id="fn1">[\s\S]*<div>[\s\S]*<\/div>[\s\S]*<\/li>/)
  assert.doesNotMatch(html, /<\/section>\n<div>/)
})

test('a closed tilde follower and an unclosed backtick follower stay in the note trace', () => {
  for (const [fence, tail] of [['~~~', 'text\n~~~'], ['```', 'text\n# h']]) {
    const source = `ref [^a]\n\n[^a]: +\n{.x\n.y}\n${fence}\n${tail}\n`
    const trace = modelTrace(source)
    assert.equal(trace[5].owner, 'doc/footnote:3', source)
    assert.equal(trace[5].form, 'lazy', source)
  }
})

test('a refused comment run keeps its heading, quote and fence followers in a note', () => {
  for (const follower of ['# h', '> q', '~~~\ntext\n~~~', '```\ntext', '~~~\ntext']) {
    const source = `ref [^a]\n\n[^a]: +\n{%x\ny%}\n${follower}\n`
    const trace = modelTrace(source)
    assert.equal(trace[5].owner, 'doc/footnote:3', source)
    assert.equal(trace[5].form, 'lazy', source)
  }
})

test('a refused brace run keeps its fence follower in the attached paragraph', () => {
  let count = 0
  for (const host of ['[^a]: +', ':: t\n: +', '- +', '1. +']) {
    for (const run of ['```', '````', '~~~', '~~~~']) {
      for (const payload of ['a', '  a', '# h', '> q', 'plain text']) {
        if (host === '[^a]: +' && (run.startsWith('~') || payload === '# h' || payload === '> q')) continue
        for (const tail of ['', '\n', '\nnext', '\n- next', '\n# next', '\n::: note\nbody\n:::']) {
          for (const brace of ['{.x\n.y}', '{#id\n.more}', '{key=one\ntwo}']) {
            const source = `${host}\n${brace}\n${run}\n${payload}\n${run}${tail}\n`
            const trace = modelTrace(source)
            const braceLine = host.split('\n').length + 1
            const follower = trace[braceLine + 1]
            assert.equal(follower.owner, trace[braceLine - 1].owner, source)
            assert.ok(['lazy', 'text'].includes(follower.form), source)
            assert.doesNotMatch(renderDoc(parse(source)), /<pre><code>/, source)
            count++
          }
        }
      }
    }
  }
  assert.equal(count, 1188)
})
