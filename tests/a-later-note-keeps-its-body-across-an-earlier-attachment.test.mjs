import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const noteText = (source, label) => {
  const doc = parse(source)
  return doc.footnoteDefs.get(label)
}

test('a later note owns an immediate indented body when both markers refuse', () => {
  const source = '[^a]: +\n[^b]: +\n  own\n\n[^a] [^b]\n'
  assert.deepEqual(noteText(source, 'a'), [])
  assert.deepEqual(noteText(source, 'b'), [{ t: 'para', lines: ['own'] }])
  const html = renderDoc(parse(source))
  assert.match(html, /<li id="fn2">\s*<p>own<a href="#fnref2"/)
  assert.doesNotMatch(html, /<p>\+<a href="#fnref2"/)
})

test('an earlier note can claim a paragraph while the later note keeps its body', () => {
  const source = '[^a]: +\n[^b]: +\npara\n\n  own\n\n[^a] [^b]\n'
  assert.deepEqual(noteText(source, 'a'), [{ t: 'para', lines: ['para'] }])
  assert.deepEqual(noteText(source, 'b'), [{ t: 'para', lines: ['own'] }])
})

test('the later body keeps its paragraph continuation and later block', () => {
  const source = '[^a]: +\n[^b]: +\npara\n\n  own\nlazy\n\n  # headed\n\n[^a] [^b]\n'
  const html = renderDoc(parse(source))
  assert.match(html, /<li id="fn1">\s*<p>para<a href="#fnref1"/)
  assert.match(html, /<li id="fn2">\s*<p>own\nlazy<\/p>\s*<h1 id="headed">headed<\/h1>/)
})

test('a blank between later note body paragraphs remains a paragraph boundary', () => {
  const source = '[^a]: +\n[^b]: +\npara\n\n  own\n\n  second\n\n[^a] [^b]\n'
  assert.deepEqual(noteText(source, 'a'), [{ t: 'para', lines: ['para'] }])
  assert.deepEqual(noteText(source, 'b'), [
    { t: 'para', lines: ['own'] },
    { t: 'para', lines: ['second'] },
  ])
})

test('a quoted later note keeps its body across a quote blank line', () => {
  const source = '> [^a]: +\n> [^b]: +\n>\n>   own\n\n[^a] [^b]\n'
  assert.deepEqual(noteText(source, 'a'), [])
  assert.deepEqual(noteText(source, 'b'), [{ t: 'para', lines: ['own'] }])
})

test('a losing later definition does not move its body into the earlier note', () => {
  const source = '[^b]: x\n[^a]: +\n[^b]: +\npara\n\n  own\n\n[^a] [^b]\n'
  // PART 9R R2 and the #5474 ruling leave the losing `+` follower in `a`.
  assert.deepEqual(noteText(source, 'a'), [{ t: 'para', lines: ['para'] }, { t: 'para', lines: ['own'] }])
  assert.deepEqual(noteText(source, 'b'), [{ t: 'para', lines: ['x'] }])
})

test('a note-shaped code payload does not claim the following continuation', () => {
  const source = ['[^a]: +', '```', '[^b]: %%', '```', '', '  own', '', '[^a] [^b]', ''].join('\n')
  const doc = parse(source)
  assert.equal(doc.footnoteDefs.has('b'), false)
  assert.deepEqual(doc.footnoteDefs.get('a'), [
    { t: 'code', lang: '', title: null, text: '[^b]: %%\n' },
    { t: 'para', lines: ['own'] },
  ])
})
