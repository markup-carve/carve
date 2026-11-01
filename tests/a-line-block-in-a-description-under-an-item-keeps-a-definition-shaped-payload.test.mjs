import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4757: a line block in a description under a list item reads its payload
// and its lazy line as the same description does at document level.
const render = source => renderDoc(parse(source))
const norm = html => html.split('\n').map(l => l.trim()).filter(Boolean)

const hosts = [['- ', '<ul>', '</ul>'], ['1. ', '<ol>', '</ol>'], ['10. ', '<ol start="10">', '</ol>'], ['-  ', '<ul>', '</ul>']]
const payloads = ['[x]: /u', '[x]: /u "t"', '[^1]: n', '*[A]: b', '{x}', 'c']

for (const [host, open, close] of hosts) for (const lead of [': ', ':  ']) {
  test(`${JSON.stringify(host)} holding a ${JSON.stringify(lead)} line block reads like the document-level description`, () => {
    for (const payload of payloads) for (let extra = 0; extra <= 2; extra++) for (const lazy of ['b\n', ' b\n', 'b\nc\n']) {
      const body = indent => `:: u\n${indent}${lead}::: |\n${indent}${' '.repeat(lead.length + extra)}${payload}\n${lazy}`
      const item = norm(render(host + body(' '.repeat(host.length))))
      assert.deepEqual([item[0], item[1], item.at(-2), item.at(-1)], [open, '<li>', '</li>', close], payload)
      assert.deepEqual(item.slice(2, -2), norm(render(body(''))), JSON.stringify(payload + '\n' + lazy))
    }
  })
}

test('a footnote- or marker-shaped payload line opens no note or sublist for the next payload line', () => {
  for (const shaped of ['[^1]: n', '- l', '1. l']) for (const next of ['[x]: /u', '{z}', 'c']) {
    const body = indent => `:: u\n${indent}: ::: |\n${indent}   [y]: /v\n${indent}  ${shaped}\n${indent}    ${next}\nb\n`
    assert.deepEqual(norm(render('- ' + body('  '))).slice(2, -2), norm(render(body(''))), shaped + ' / ' + next)
  }
})
