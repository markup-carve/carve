// carve#4396, carve#4409: a refused `+` reads as any letter would, so spelling it `x` changes only that character.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const WRAPPERS = [
  { kind: 'item', first: ['- '], rest: '  ' },
  { kind: 'ordered', first: ['1. '], rest: '   ' },
  { kind: 'task', first: ['- [ ] '], rest: '  ' },
  { kind: 'description', first: [':: t', ': '], rest: '  ' },
  { kind: 'note', first: ['[^a]: '], rest: '  ' },
  { kind: 'quote', first: ['> '], rest: '> ' },
]
const LEAVES = [
  ['a'], ['a', 'b'], ['a', ''], ['```', 'code'], ['```', 'code', '```'], ['```', '', ''], ['~~~', 'code'],
  ['> q'], ['> q', ''], [':::', 'd'], ['- s'], ['# H'],
]
const FOLLOWERS = [
  [], [''], ['para'], [' para'], ['  para'], ['   para'], ['    para'], ['      para'], ['', 'para'], ['', '  para'],
  ['- sib'], ['  - sib'], ['    - sib'], ['1. sib'], ['```', 'f', '```'], ['  ```', '  f', '  ```'], ['> r'], ['  > r'],
  ['# H2'], ['  # H2'], ['[^c]: n'], [':: u', ': v'], [':::', 'z', ':::'], ['| c |'],
]

const wrap = (wrappers, lines) => {
  let out = lines
  for (const w of [...wrappers].reverse()) {
    const lead = w.first.at(-1)
    out = [...w.first.slice(0, -1), ...out.map((line, i) => (i === 0 ? lead + line : line === '' && w.kind !== 'quote' ? '' : w.rest + line))]
  }
  return out
}

function* documents(count, seed) {
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const pick = (list) => list[Math.floor(random() * list.length)]
  const seen = new Set()
  for (let tries = 0; seen.size < count && tries < count * 40; tries++) {
    // A second note under one label would be dropped as a duplicate, with its `+`.
    const wrappers = Array.from({ length: 1 + Math.floor(random() * 3) }, () => pick(WRAPPERS))
      .map((w, i) => (w.kind === 'note' ? { ...w, first: [`[^n${i}]: `] } : w))
    const quotes = wrappers.filter((w) => w.kind === 'quote').length
    let body
    let plusLine
    if (random() < 0.3) {
      body = wrap(wrappers, ['+'])
      plusLine = body.length - 1
    } else {
      body = wrap(wrappers, pick(LEAVES))
      plusLine = body.length
      body.push('> '.repeat(Math.floor(random() * (quotes + 1))) + ' '.repeat(Math.floor(random() * 7)) + '+')
    }
    const prefix = random() < 0.5 && quotes > 0 ? '> '.repeat(Math.ceil(random() * quotes)) : ''
    const tail = pick(FOLLOWERS).map((line) => (line === '' ? prefix.trimEnd() : prefix + line))
    const notes = wrappers.flatMap((w, i) => (w.kind === 'note' ? ['', `[^n${i}]`] : []))
    const source = [...body, ...tail, ...notes].join('\n') + '\n'
    if (seen.has(source)) continue
    seen.add(source)
    yield { source, plusLine }
  }
}

const COUNT = 3000

test(`a refused + reads as a letter across ${COUNT} generated documents`, () => {
  let refused = 0
  const broken = []
  for (const { source, plusLine } of documents(COUNT, 4396)) {
    const sink = {}
    const html = renderDoc(parse(source, { stateSink: sink }))
    if (!sink.refusedPlusLines.includes(plusLine)) continue
    refused++
    const lines = source.split('\n')
    lines[plusLine] = lines[plusLine].replace(/\+[ \t]*$/, 'x')
    if (html.replaceAll('+', 'x') !== renderDoc(parse(lines.join('\n')))) broken.push(source)
  }
  assert.deepEqual(broken, [])
  assert.ok(refused > COUNT / 2, `only ${refused} documents refused their +`)
})

test('the property can fail: an accepted + does not read as a letter', () => {
  assert.notEqual(renderDoc(parse('- +\npara\n')).replaceAll('+', 'x'), renderDoc(parse('- x\npara\n')))
})

test('the ruled reproduction reads as a note holding one paragraph', () => {
  const read = (letter) => renderDoc(parse(`> [^b]: ${letter}\npara\n\n[^b]\n`))
  assert.match(read('+'), /<p>\+\npara/)
  assert.equal(read('+').replaceAll('+', 'x'), read('x'))
})

for (const [name, source, expected] of [
  ['a list after a marker-line + in a description', ':: t\n: +\n- l\n', /<dd>\s*<ul>\s*<li>l<\/li>\s*<\/ul>\s*<\/dd>/],
  ['a list after a marker-line + in a note', '[^a]: +\n- l\n\nr[^a]\n', /<li id="fn1">\s*<ul>\s*<li>l<\/li>/],
  ['a list after a marker-line + in a quote', '> +\n- l\n', /<blockquote>\s*<ul>\s*<li>l<\/li>/],
  ['a list after a separate + in a description', ':: t\n: x\n+\n- l\n', /<dd>\s*<p>x<\/p>\s*<ul>/],
]) {
  test(`one rule attaches ${name}`, () => assert.match(renderDoc(parse(source)), expected))
}

for (const [name, source, expected] of [
  ['a refused marker-line + and its lazy line (corpus 838)', ':: t\n: - +\np\n', /<li>\+\np<\/li>/],
  ['a follower at the content column', '- +\n  para\n', /<li>\+\npara<\/li>/],
  ['a list marker under an item', '- +\n- b\n', /<li>\+<\/li>\s*<li>b<\/li>/],
  ['an off-column follower under a nested item', '- a\n  - +\npara\n', /<li>\+\npara<\/li>/],
  ['an unprefixed follower of an inner quote', '> > +\n# H\n', /<p>\+<\/p>\s*<\/blockquote>\s*<\/blockquote>\s*<section/],
  ['a blank before the follower', '- +\n\npara\n', /<li>\+<\/li>/],
]) {
  test(`one rule refuses ${name}`, () => assert.match(renderDoc(parse(source)), expected))
}
