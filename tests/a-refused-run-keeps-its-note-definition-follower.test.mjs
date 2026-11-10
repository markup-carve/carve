import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// CARVE-P2-035, carve#5830: the note definition follows ordinary ownership.
for (const source of [
  ':: t\n: {.x\n}\n[^m]: n\nz\n',
  '- {.x\n}\n[^m]: n\nz\n',
  '- a\n  {.x\n  }\n[^m]: n\nz\n',
  '- :: t\n  : {.x\n}\n[^m]: n\nz\n',
  '- :: t\n  : a\n\n    {.x\n    }\n [^m]: n\nz\n',
]) test('a refused opener claims no note-definition follower', () => {
  const escaped = source.replace('{', '\\{')
  assert.equal(renderDoc(parse(source)), renderDoc(parse(escaped)))
  const at = source.split('\n').findIndex(line => line.trimStart().startsWith('[^m]:')) + 1
  assert.equal(modelTrace(source).find(record => record.line === at)?.owner,
    modelTrace(escaped).find(record => record.line === at)?.owner)
})

for (const source of [
  '- {.x\n}\n{.q}\nz\n',
  '- {.x\n}\ny\n[^m]: n\n\nsee[^m]\n',
  '- : {.x\n}\n[^m]: n\n\nsee[^m]\n',
]) test('later definitions follow ordinary owner rules', () => {
  assert.equal(renderDoc(parse(source)), renderDoc(parse(source.replace('{', '\\{'))))
})
