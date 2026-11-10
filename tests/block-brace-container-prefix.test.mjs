import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('900 continuations missing a container prefix refuse their opener', () => {
  const hosts = [
    (a, b, c) => `> ${a}\n  ${b}\n> ${c}\n`,
    (a, b, c) => `> > ${a}\n>   ${b}\n> > ${c}\n`,
    (a, b, c) => `> - ${a}\n   ${b}\n>   ${c}\n`,
    (a, b, c) => `- > ${a}\n  ${b}\n  > ${c}\n`,
    (a, b, c) => `[^n]: ${a}\n  ${b}\n      ${c}\n\nsee[^n]\n`,
    (a, b, c) => `:: term\n: ${a}\n ${b}\n  ${c}\n`,
  ]
  const openers = ['{.x', '{#x', '{k=v', '{% c', '{.x k=v']
  const closers = ['}', '.y}', '%}', '}', '.y}']
  const followers = ['# H', '> q', '```', ':: t', 'x', '- q']
  const tails = ['', '\nmore', '\n\nlater', '\n> nested', '\n- second']
  let count = 0
  for (const host of hosts)
    for (let o = 0; o < openers.length; o++)
      for (const follower of followers)
        for (const tail of tails) {
          const source = host(openers[o], closers[o], follower + tail)
          assert.equal(render(source), render(source.replace('{', '\\{')), source)
          count++
        }
  assert.equal(count, 900)
})

test('prefixed wrapped attributes have the same result as one-line attributes', () => {
  const pairs = [
    ['{.x\n .y}\n# H\n', '{.x .y}\n# H\n'],
    ['- {.x\n   .y}\n  # H\n', '- {.x .y}\n  # H\n'],
    ['- [ ] {.x\n       .y}\n      # H\n', '- [ ] {.x .y}\n      # H\n'],
    ['> {.x\n>  .y}\n> # H\n', '> {.x .y}\n> # H\n'],
    ['> > {.x\n> >  .y}\n> > # H\n', '> > {.x .y}\n> > # H\n'],
    [':: term\n: {.x\n   .y}\n  # H\n', ':: term\n: {.x .y}\n  # H\n'],
    ['[^n]: {.x\n       .y}\n       # H\n\nsee[^n]\n', '[^n]: {.x .y}\n       # H\n\nsee[^n]\n'],
    ['> - {.x\n>    .y}\n>   # H\n', '> - {.x .y}\n>   # H\n'],
    ['> [^a]: +\n>   {#i\n>    .y}\nnext\n\nsee[^a]\n',
      '> [^a]: +\n>   {#i .y}\nnext\n\nsee[^a]\n'],
  ]
  for (const [wrapped, single] of pairs) assert.equal(render(wrapped), render(single), wrapped)
})

test('prefixed wrapped comments have the same result as one-line comments', () => {
  const pairs = [
    ['> {% c\n>  %}\n> # H\n', '> {% c %}\n> # H\n'],
    ['- {% c\n   %}\n  # H\n', '- {% c %}\n  # H\n'],
    ['> - {% c\n>    %}\n>   # H\n', '> - {% c %}\n>   # H\n'],
  ]
  for (const [wrapped, single] of pairs) assert.equal(render(wrapped), render(single), wrapped)
})
