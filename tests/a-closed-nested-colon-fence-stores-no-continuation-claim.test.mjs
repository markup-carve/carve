import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const depth of [1, 2, 3, 8]) {
  const prefix = '> '.repeat(depth)
  for (const body of ['', 'p\n']) test(`closed colon fence at quote depth ${depth}, body ${JSON.stringify(body)}`, () => {
    const source = ['::: d', ...(body ? ['p'] : []), ':::'].map(line => prefix + line + '\n').join('') + 'y\n'
    const doc = parse(source)
    assert.equal(doc.blocks.length, 2)
    assert.deepEqual(doc.blocks[1], { t: 'para', lines: ['y'] })
    assert.match(renderDoc(doc), /<\/blockquote>\n<p>y<\/p>$/)
  })
  test(`invalid colon opener retains its paragraph at quote depth ${depth}`, () => {
    const source = [':::note', 'body', ':::'].map(line => prefix + line + '\n').join('') + 'y\n'
    const doc = parse(source)
    assert.equal(doc.blocks.length, 1)
    assert.match(renderDoc(doc), /:::note\nbody\n:::\ny<\/p>/)
  })
  for (const boundary of ['# H', '---', '', '%% comment']) test(`absorption ends at ${JSON.stringify(boundary)} at depth ${depth}`, () => {
    const source = [':::note', boundary, ':::'].map(line => prefix + line + '\n').join('') + 'y\n'
    assert.deepEqual(parse(source).blocks.at(-1), { t: 'para', lines: ['y'] })
  })
}

test('a shallower quote boundary clears a deeper paragraph', () => {
  const source = '> > :::note\n> # H\n> > :::\ny\n'
  assert.deepEqual(parse(source).blocks.at(-1), { t: 'para', lines: ['y'] })
})

test('a deeper invalid opener cannot absorb a shallower colon fence', () => {
  const source = '> > > :::note\n> > :::\ny\n'
  assert.deepEqual(parse(source).blocks.at(-1), { t: 'para', lines: ['y'] })
})

for (const lazy of ['> body', '> > body', 'body']) test(`lazy ${JSON.stringify(lazy)} preserves nested absorption`, () => {
  const source = '> > > :::note\n' + lazy + '\n> > > :::\ny\n'
  assert.equal(parse(source).blocks.length, 1)
  assert.match(renderDoc(parse(source)), /:::note\nbody\n:::\ny<\/p>/)
})

test('a real div closer wins over malformed text in its body', () => {
  const source = '> > ::: d\n> > :::note\n> > :::\ny\n'
  assert.deepEqual(parse(source).blocks.at(-1), { t: 'para', lines: ['y'] })
})

for (const first of ['# H', '::: d']) test(`a bare run after ${JSON.stringify(first)} leaves no claim`, () => {
  const source = '> > ' + first + '\n> > :::: \ny\n'
  assert.deepEqual(parse(source).blocks.at(-1), { t: 'para', lines: ['y'] })
})
