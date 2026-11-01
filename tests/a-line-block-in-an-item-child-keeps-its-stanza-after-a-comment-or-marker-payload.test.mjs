import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4762, carve#4763: a line block in an item's child reads a comment line and a
// marker-shaped payload line as the same line block does at document level.
const render = source => renderDoc(parse(source))
const norm = html => html.split('\n').map(l => l.trim()).filter(Boolean)
const indent = (s, by) => s.split('\n').map((l, k) => k === 0 || l === '' ? l : by + l).join('\n')

const hosts = [
  ['- - ', '    ', '', 4, 4],
  ['- 1. ', '     ', '', 4, 4],
  ['  : ', '    ', '- :: u\n', 5, 4],
  ['   : ', '     ', '1. :: u\n', 5, 4],
  [': - ', '    ', ':: u\n', 5, 4],
]
const bodies = [
  ['%% c'], ['x', '%% c'], ['%% c', 'x'], ['%% c d', '%% e'],
  ['[x]: /u', '- l', ' :::'], ['[x]: /u', '- l', '   :::'], ['x', '1. l', '  :::'], ['[^1]: n', '- l', '  :::'],
]

for (const [lead, cont, pre, open, close] of hosts) {
  test(`${JSON.stringify(pre + lead)} keeps the stanza open like the document-level line block`, () => {
    for (const body of bodies) for (const lazy of ['b\n', 'b\nc\n']) {
      const lines = ['::: |', ...body]
      const doc = norm(render(lines.join('\n') + '\n' + lazy))
      const nested = norm(render(pre + lead + indent(lines.join('\n'), cont) + '\n' + lazy))
      assert.deepEqual(nested.slice(open, -close), doc, JSON.stringify(body.join('\n') + '\n' + lazy))
    }
  })
}
