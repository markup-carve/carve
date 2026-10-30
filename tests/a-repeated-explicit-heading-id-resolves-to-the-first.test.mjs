import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const links = source => [...renderDoc(parse(source)).matchAll(/<a href="#x">(.*?)<\/a>/g)].map(m => m[1])

const hosts = {
  document: t => `{#x}\n# ${t}\n`,
  quote: t => `> {#x}\n> # ${t}\n`,
  item: t => `- l\n\n  {#x}\n  # ${t}\n`,
  div: t => `::: d\n{#x}\n# ${t}\n:::\n`,
}

for (const [first, wrapFirst] of Object.entries(hosts)) {
  for (const [second, wrapSecond] of Object.entries(hosts)) {
    test(`carve#4450: ${first} then ${second} resolves to the first`, () => {
      const body = `${wrapFirst('A')}\n${wrapSecond('B')}\n`
      assert.deepEqual(links(`${body}\n</#x>\n`), ['A'])
      assert.deepEqual(links(`</#x>\n\n${body}`), ['A'])
    })
  }
}

test('carve#4450: an auto slug still dedups against a repeated explicit id', () => {
  const html = renderDoc(parse('{#x}\n# A\n\n{#x}\n# B\n\n# x\n\n</#x> </#x-2>\n'))
  assert.match(html, /<a href="#x">A<\/a> <a href="#x-2">x<\/a>/)
})

test('carve#4451: CARVE-P2-004 leaves ASCII folding to the host', () => {
  const text = fs.readFileSync(new URL('../resources/spec/03-blocks-core.ebnf', import.meta.url), 'utf8')
  assert.match(text, /ASCII folding is\s+HOST-DEFINED/)
  assert.doesNotMatch(text, /MUST use the same table/)
})

test('an unclosed fence and a first-block note are grammar productions', () => {
  const dir = new URL('../resources/spec/', import.meta.url)
  const core = fs.readFileSync(new URL('03-blocks-core.ebnf', dir), 'utf8')
  const raw = fs.readFileSync(new URL('04-blocks-tables-containers.ebnf', dir), 'utf8')
  const note = fs.readFileSync(new URL('07-inline-rich-text.ebnf', dir), 'utf8')
  assert.match(core, /fenced_code_block = [^;]*\[code_fence_close, newline\] ;/)
  assert.match(raw, /raw_block = [^;]*\[code_fence_close, newline\] ;/)
  assert.match(note, /footnote_definition = [^;]*\| "\[\^", footnote_label, "\]:", space\+, first_block_content ;/)
})
