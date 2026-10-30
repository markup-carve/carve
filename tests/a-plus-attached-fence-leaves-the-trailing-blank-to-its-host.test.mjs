import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))
const payload = (source) => /<pre[^>]*><code[^>]*>([^]*?)<\/code>/.exec(render(source))?.[1]

// PART 9 SS17 L3: the block ends the attachment, whatever column its payload lines stand at.
test('a payload line at the body column does not move the trailing blank into the fence', () => {
  const cases = [
    ['[^f]: +\n```\na\n  b\n\nsee[^f]\n', 'a\n  b\n'],
    ['[^f]: n\n+\n```\na\n  b\n\nsee[^f]\n', 'a\n  b\n'],
    ['[^f]: +\n```\na\n  b\n\n\nsee[^f]\n', 'a\n  b\n'],
    ['[^f]: +\n```\na\n\n  b\n\nsee[^f]\n', 'a\n\nb\n'],
    ['> [^f]: +\n> ```\n> a\n>   b\n>\n> see[^f]\n', 'a\n  b\n'],
    [':: t\n: +\n```\na\n  b\n\nsee\n', 'a\n  b\n'],
    [':: t\n: n\n+\n```\na\n  b\n\nsee\n', 'a\n  b\n'],
    [':: t\n: +\n~~~\na\n  b\n\nsee\n', 'a\n  b\n'],
  ]
  for (const [source, expected] of cases) assert.equal(payload(source), expected, source)
})

// PART 0 S2 still holds for a fence the body itself opens (corpus 291, carve#4033).
test('a fence opened at the body column keeps the trailing blank', () => {
  const cases = [
    ['[^f]: n\n  ```\n  x\n\nsee[^f]\n', 'x\n\n'],
    [':: t\n: ```\n  x\n\nsee\n', 'x\n\n'],
    ['[^f]: +\n```\na\n\n  ```\n\n  ```\n  d\n\nsee[^f]\n', 'a\n\n'],
  ]
  for (const [source, expected] of cases) assert.equal(payload(source), expected, source)
  assert.match(render('[^f]: +\n```\na\n\n  ```\n\n  ```\n  d\n\nsee[^f]\n'), /<code>d\n\n<\/code>/)
})

// A comment line leaves the attachment as if it were absent, like an attribute run.
test('a comment before an attached fence leaves the same payload', () => {
  const cases = [
    ['- +\n```\na\nsee\n', '- +\n%% c\n```\na\nsee\n'],
    ['- +\n```\na\n- x\n', '- +\n%% c\n```\na\n- x\n'],
    ['- a\n+\n```\nb\n\nsee\n', '- a\n+\n%% c\n```\nb\n\nsee\n'],
    ['[^f]: +\n```\na\nsee\n\nx[^f]\n', '[^f]: +\n%% c\n```\na\nsee\n\nx[^f]\n'],
    [':: t\n: +\n```\n  a\n\nsee\n', ':: t\n: +\n%% c\n```\n  a\n\nsee\n'],
  ]
  for (const [plain, commented] of cases) assert.equal(render(commented), render(plain), commented)
})
