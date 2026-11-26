import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const cases = JSON.parse(readFileSync(new URL('../spec/0.2/conformance/clause-cases.json', import.meta.url), 'utf8')).cases
const pairCodes = [
  'markdown-strong-double-star',
  'markdown-strikethrough-double-tilde',
  'djot-emphasis-underscore',
  'djot-subscript-tilde',
  'djot-superscript-caret',
]

function tests(node, found = []) {
  if (Array.isArray(node)) node.forEach((part) => tests(part, found))
  else if (node && typeof node === 'object') {
    if (Array.isArray(node.matches)) found.push(node.matches)
    Object.values(node).forEach((part) => tests(part, found))
  }
  return found
}

test('non-strict pair cases pin the escaped opener group for each affected mark', () => {
  for (const code of pairCodes) {
    const row = model.rules.find((item) => item.id === code)
    assert.equal(row.each.pairs.length, 2, code)
    const guard = tests(row.report).find(([subject]) => subject?.slice?.[1]?.sub?.[0]?.match === 'backslashes')
    assert.ok(guard, `${code} must read the backslashes group`)
    const pattern = new RegExp(guard[1])
    assert.equal(pattern.test('\\'), true, code)
    assert.equal(pattern.test('\\\\'), false, code)
    assert.equal(pattern.test('\\\\\\'), true, code)
    const sample = cases.find((item) => item.summary === `${code} skips an escaped opener`)
    assert.ok(sample, `missing conformance case for ${code}`)
    assert.deepEqual(sample.expected.notReported, [code])
    if (code.startsWith('djot-')) assert.equal(sample.options.rules[code], 'on')
  }
})

test('both block opener fields skip every comment-only line behind attributed blocks', () => {
  for (const family of ['block_fields', 'attribute_owner_fields']) {
    const field = model[family].find((item) => item.name === 'opener_start')
    assert.ok(field, family)
    assert.match(field.means, /attribute lines and any comment-only lines between them and the block/)
    assert.ok(field.clauses.includes('C2-B-137'))
  }
  for (const id of ['CC-1578', 'CC-1579', 'CC-1580']) assert.ok(cases.some((item) => item.id === id))
})
