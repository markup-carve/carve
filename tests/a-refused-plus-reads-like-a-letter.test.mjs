import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

// carve#4396: swapping a refused `+` for a letter changes only that character.
const hosts = ['', '> ', '> > ', '- ', '1. ', '> - ', '- > ', ':: t\n: ', '> :: t\n> : ']
const followers = ['- b', ' - b', '  - b', '* b', '1. b', '^ cap', 'para', '# H', '> q', '```\nc\n```', ':::\nd\n:::', '---']
for (const host of hosts) {
  for (const follower of followers) {
    const source = (letter) => `${host}[^a]: ${letter}\n${follower}\n\nr[^a]\n`
    test(`${JSON.stringify(source('+'))} reads as under a letter when refused`, () => {
      const out = html(source('+'))
      if (!out.includes('<p>+')) return
      assert.equal(out, html(source('Q')).replaceAll('Q', '+'))
    })
  }
}

test('a marker line an item\'s open quote folds carries no + for the next line', () => {
  for (const follower of ['> q', '# H', '---', 'para', '```\nc\n```', ':::\nd\n:::', '| a |', '^ cap']) {
    for (const before of ['', '  - x\n', '  1. x\n  y\n']) {
      const source = (letter) => `- > a\n${before}  - ${letter}\n${follower}\n`
      assert.equal(html(source('+')), html(source('Q')).replaceAll('Q', '+'))
    }
  }
})

test('the ticket reproduction holds a note with one paragraph', () => {
  assert.deepEqual(parse('> [^b]: +\npara\n\n[^b]\n').footnoteDefs.get('b'), [{ t: 'para', lines: ['+', 'para'] }])
})
