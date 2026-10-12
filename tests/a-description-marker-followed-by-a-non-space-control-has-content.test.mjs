import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const hosts = [
  {
    name: 'plain definition list',
    source: (body) => `:: t\n: ${body}\n`,
    html: (entry) => `<dl>\n${entry('  ')}\n</dl>`,
  },
  {
    name: 'list item',
    source: (body) => `- :: t\n  : ${body}\n`,
    html: (entry) => `<ul>\n  <li>\n    <dl>\n${entry('      ')}\n    </dl>\n  </li>\n</ul>`,
  },
  {
    name: 'quote',
    source: (body) => `> :: t\n> : ${body}\n`,
    html: (entry) => `<blockquote>\n  <dl>\n${entry('    ')}\n  </dl>\n</blockquote>`,
  },
]

for (const host of hosts) {
  for (const [name, character, encoded] of [
    ['VT', '\u000b', '\u000b'],
    ['FF', '\u000c', '\u000c'],
    ['NBSP', '\u00a0', '&nbsp;'],
  ]) {
    for (const suffix of ['', 'x']) {
      test(`${name} ${suffix ? 'followed by text' : 'alone'} opens a description in a ${host.name}`, () => {
        const expected = host.html((indent) =>
          `${indent}<dt>t</dt>\n${indent}<dd>${encoded}${suffix}</dd>`)
        assert.equal(renderDoc(parse(host.source(character + suffix))), expected)
      })
    }
  }

  for (const [name, body] of [['spaces', '   '], ['tab', '\t']]) {
    test(`${name} alone stays content-less in a ${host.name}`, () => {
      const expected = host.html((indent) => `${indent}<dt>t\n:</dt>`)
      assert.equal(renderDoc(parse(host.source(body))), expected)
    })
  }
}
