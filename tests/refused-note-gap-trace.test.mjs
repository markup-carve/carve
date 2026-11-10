import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('corpus 988 traces the reader paragraph after an empty refused note', () => {
  for (const suffix of ['', '-2']) {
    const name = `988-a-lazy-line-after-a-double-plus-note-has-no-sentinel${suffix}`
    const source = readFileSync(new URL(`../tests/corpus/${name}.crv`, import.meta.url), 'utf8')
    const trace = modelTrace(source)
    assert.deepEqual(trace.slice(3).map(({ form, owner }) => [form, owner]), [
      ['text', 'doc'], ['text', 'doc'],
    ])
    assert.equal(renderDoc(parse(source)), readFileSync(new URL(`../tests/corpus/${name}.html`, import.meta.url), 'utf8').trimEnd())
  }
})

test('2,000 generated empty-note gaps trace the same paragraph as the reader', () => {
  let count = 0
  for (let label = 0; label < 10; label++) {
    for (let shift = 0; shift < 4; shift++) {
      for (const follower of ['> q', '[^b]: > q', '# h', '::: note', 'plain']) {
        for (const tail of ['lazy', 'words', 'next', 'tail', 'more']) {
          for (const preface of ['', 'intro\n\n']) {
            const pad = ' '.repeat(shift)
            const source = `${preface}${pad}[^a${label}]: +\n${pad}+\n\n${pad}  ${follower}\n${tail}${label}\n`
            const first = source.split('\n').findIndex((line) => line.trim() === follower)
            const trace = modelTrace(source)
            assert.equal(trace[first].owner, 'doc', source)
            assert.equal(trace[first].form, 'text', source)
            assert.equal(trace[first + 1].owner, 'doc', source)
            assert.equal(trace[first + 1].form, 'text', source)
            const doc = parse(source)
            assert.ok(doc.blocks.some((block) => block.t === 'para' && block.lines[0] === follower), source)
            count++
          }
        }
      }
    }
  }
  assert.equal(count, 2000)
})

test('a list after the same gap is a document list', () => {
  const source = '[^a]: +\n+\n\n  - li\nlazy\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/item:4')
  assert.equal(trace[3].form, 'item')
  assert.equal(trace[4].owner, 'doc/item:4')
  assert.match(renderDoc(parse(source)), /<ul>\n  <li>li\nlazy<\/li>/)
})

test('frontmatter preserves source line numbers for the projected paragraph', () => {
  const source = '---\ntitle: t\n---\n[^a]: +\n+\n\n  > q\nlazy\n'
  const trace = modelTrace(source)
  assert.deepEqual(trace.slice(6).map(({ line, form, owner }) => [line, form, owner]), [
    [7, 'text', 'doc'], [8, 'text', 'doc'],
  ])
})

test('repeated document paragraph text still projects the post-gap paragraph', () => {
  const source = 'plain\nlazy\n\n[^a]: +\n+\n\n  plain\nlazy\n'
  const trace = modelTrace(source)
  assert.equal(trace[6].owner, 'doc')
  assert.equal(trace[6].form, 'text')
  assert.equal(trace[7].owner, 'doc')
  assert.equal(trace[7].form, 'text')
})

test('each later list item after the gap has its own document owner', () => {
  const source = '[^a]: +\n+\n\n  - li\n  - two\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/item:4')
  assert.equal(trace[4].owner, 'doc/item:5')
  assert.equal(trace[4].form, 'item')
  assert.match(renderDoc(parse(source)), /<li>li<\/li>\n  <li>two<\/li>/)
})

test('1,000 generated two-item lists keep both source item owners', () => {
  let count = 0
  for (let label = 0; label < 10; label++) {
    for (let shift = 0; shift < 4; shift++) {
      for (const first of ['a', 'b', 'one', 'alpha', 'first']) {
        for (const second of ['c', 'd', 'two', 'beta', 'second']) {
          const pad = ' '.repeat(shift)
          const source = `${pad}[^n${label}]: +\n${pad}+\n\n${pad}  - ${first}\n${pad}  - ${second}\n`
          const trace = modelTrace(source)
          assert.equal(trace[3].owner, 'doc/item:4', source)
          assert.equal(trace[4].owner, 'doc/item:5', source)
          assert.equal(parse(source).blocks[0]?.t, 'list', source)
          count++
        }
      }
    }
  }
  assert.equal(count, 1000)
})

test('the post-gap paragraph is selected after an earlier shorter prefix', () => {
  const source = 'plain\n\n[^a]: +\n+\n\n  plain\nmore\n'
  const trace = modelTrace(source)
  assert.equal(trace[5].owner, 'doc')
  assert.equal(trace[6].owner, 'doc')
  assert.equal(trace[6].form, 'text')
})

test('a later list is selected after an earlier list with the same first item', () => {
  const source = '- one\n- two\n\n[^a]: +\n+\n\n  - one\n  - three\n'
  const trace = modelTrace(source)
  assert.equal(trace[6].owner, 'doc/item:7')
  assert.equal(trace[7].owner, 'doc/item:8')
  assert.equal(trace[7].form, 'item')
})

test('a blank between projected list items belongs to the preceding document item', () => {
  const source = '[^a]: +\n+\n\n  - li\n\n  - two\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/item:4')
  assert.equal(trace[4].owner, 'doc/item:4')
  assert.equal(trace[4].form, 'blank')
  assert.equal(trace[5].owner, 'doc/item:6')
  assert.equal(trace[5].form, 'item')
})

test('earlier footnote text cannot claim the later document paragraph', () => {
  const source = '[^x]: +\n+\n  plain\nlazy\n\n[^a]: +\n+\n\n  plain\nlazy\n'
  const trace = modelTrace(source)
  assert.equal(trace[8].owner, 'doc')
  assert.equal(trace[9].owner, 'doc')
})

test('a nested list after the gap keeps its document item paths', () => {
  const source = '[^a]: +\n+\n\n  - li\n    - nested\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/item:4')
  assert.equal(trace[4].owner, 'doc/item:4/item:5')
})

test('a second paragraph in a list item stays in the document item', () => {
  const source = '[^a]: +\n+\n\n  - li\n\n    continued\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/item:4')
  assert.equal(trace[4].owner, 'doc/item:4')
  assert.equal(trace[5].owner, 'doc/item:4')
})

test('projected list items do not retain a footnote reached path', () => {
  const source = '[^a]: +\n+\n\n  - li\n  - two\n'
  const trace = modelTrace(source)
  assert.ok(!trace[4].reached?.includes('/footnote:'))
})

test('nested and sibling markers with identical text keep their distinct paths', () => {
  const source = '[^a]: +\n+\n\n  - li\n    - two\n  - two\n'
  const trace = modelTrace(source)
  assert.equal(trace[4].owner, 'doc/item:4/item:5')
  assert.equal(trace[5].owner, 'doc/item:6')
})

test('a trailing list blank remains with its final document item', () => {
  const source = '[^a]: +\n+\n\n  - li\n\nnext\n'
  const trace = modelTrace(source)
  assert.equal(trace[4].owner, 'doc/item:4')
})

test('later document paragraphs after the gap keep document ownership', () => {
  const source = '[^a]: +\n+\n\n  plain\n\n  next\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc')
  assert.equal(trace[5].owner, 'doc')
})

test('a gap inside a quote projects into the quote reader', () => {
  const source = '> [^a]: +\n> +\n>\n>   plain\n> lazy\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/quote:1')
  assert.equal(trace[4].owner, 'doc/quote:1')
})

test('an earlier list with the same first item cannot claim a loose later list', () => {
  const source = '- one\n- two\n\n[^a]: +\n+\n\n  - one\n\n  - three\n'
  const trace = modelTrace(source)
  assert.equal(trace[6].owner, 'doc/item:7')
  assert.equal(trace[7].owner, 'doc/item:7')
  assert.equal(trace[8].owner, 'doc/item:9')
})

test('a quoted list after the gap belongs to the quote', () => {
  const source = '> [^a]: +\n> +\n>\n>   - li\n>   - two\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/quote:1/item:4')
  assert.equal(trace[4].owner, 'doc/quote:1/item:5')
})

test('a list after a paragraph gap also leaves the note frame', () => {
  const source = '[^a]: +\n+\n\n  plain\n\n  - li\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc')
  assert.equal(trace[5].owner, 'doc/item:6')
})

test('a later footnote with a shared line-number prefix keeps its own owner', () => {
  const source = '[^a]: +\n+\n\n  plain\nlazy\n\n\n\n\n[^b]: +\n+\n'
  const trace = modelTrace(source)
  assert.equal(trace[9].owner, 'doc/footnote:10')
  assert.equal(trace[10].owner, 'doc/footnote:10')
})

test('nested quote children are eligible reader blocks', () => {
  const source = '> > [^a]: +\n> > +\n> >\n> >   plain\n> > lazy\n'
  const trace = modelTrace(source)
  assert.equal(trace[3].owner, 'doc/quote:1/quote:1')
  assert.equal(trace[4].owner, 'doc/quote:1/quote:1')
})
