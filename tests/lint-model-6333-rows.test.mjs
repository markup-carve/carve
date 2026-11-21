// carve#6333: the definition-term-block-folded group is the marker alone, and github-alert-marker skips a line
// whose first `>` is glued to anything but the alert mark (C2-B-031), as the catalog rows state.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const rule = (id) => model.rules.find((row) => row.id === id)

test('definition-term-block-folded reports the quote mark or list marker alone', () => {
  const row = rule('definition-term-block-folded')
  const [entry] = row.report
  const pattern = new RegExp(entry.when.matches[1], 'd')
  const group = entry.start.match
  assert.equal(entry.end.match, group)
  for (const [body, marker] of [[':: > x', '>'], [':: - a', '-'], [':: * b', '*'], [':: 12. a', '12.'], [': 1) c', '1)']]) {
    const m = pattern.exec(body)
    assert.ok(m, body)
    assert.equal(body.slice(...m.indices.groups[group]), marker, body)
  }
  for (const body of [':: >a', ':: >', ':: term']) assert.equal(pattern.exec(body), null, body)
})

test('github-alert-marker needs a quote mark as the first non-space character', () => {
  const row = rule('github-alert-marker')
  const tests = row.when.all
  const holds = (text) => tests.every((t) => {
    if (t.in) return true
    if (t.not) return !new RegExp(t.not.matches[1]).test(text)
    return new RegExp(t.matches[1]).test(text)
  })
  for (const text of ['> [!NOTE]', '>[!NOTE]', '  > [!TIP]', '> - > [!NOTE]', '> [x]: > [!NOTE]', '> >> [!NOTE]', '>\t[!NOTE]']) assert.ok(holds(text), text)
  for (const text of ['>* > [!NOTE]', '>- > [!NOTE]', '>1. > [!NOTE]', '>[x]: > [!NOTE]', '>> [!NOTE]', ' >>[!NOTE]']) assert.ok(!holds(text), text)
})
