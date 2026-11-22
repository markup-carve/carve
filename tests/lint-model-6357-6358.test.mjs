import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const catalog = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-rules.json', import.meta.url), 'utf8'))
const cases = JSON.parse(readFileSync(new URL('../spec/0.2/conformance/clause-cases.json', import.meta.url), 'utf8')).cases

test('continuation marker row admits only quote prefixes or a final item marker', () => {
  const row = model.rules.find(({ id }) => id === 'deprecated-continuation-marker')
  const prefix = row.when.all.find((condition) => condition.matches)?.matches
  assert.ok(prefix, 'the row must check the source prefix')
  const pattern = new RegExp(prefix[1])
  for (const text of ['+', '> > +', '- +', '- [x] +', '> - +', '- > - +']) {
    const prefix = text.slice(0, -1)
    assert.ok(pattern.test(prefix), text)
  }
  for (const text of ['* > > +', '1. > +', '- [ ] > +']) {
    assert.ok(!pattern.test(text.slice(0, -1)), text)
  }
  assert.deepEqual(cases.find(({ id }) => id === 'CC-1615')?.expected.notReported, ['deprecated-continuation-marker'])
  let checked = 0
  const markers = ['-', '*', '1.', '9)', 'a.', 'I)', 'II.', 'iv)', '.']
  for (const marker of markers) {
    for (let depth = 0; depth < 8; depth++) {
      for (const task of ['', '[ ] ', '[x] ']) {
        for (const suffix of ['', '> ', '> > ', '> > > ']) {
          for (const lead of ['', ' ', '\t', '> ']) {
            const sourcePrefix = `${lead}${'> '.repeat(depth)}${marker} ${task}${suffix}`
            assert.equal(pattern.test(sourcePrefix), suffix === '', sourcePrefix)
            checked++
          }
        }
      }
    }
  }
  assert.equal(checked, 3456)
})

test('case-only message notes use the diagnostic phrase without quotes', () => {
  for (const id of ['broken-crossref', 'unresolved-reference-link']) {
    const row = catalog.rules.find((entry) => entry.id === id)
    const note = row.message_notes.find((entry) => entry.includes('`${caseOnlyPhrase}` is'))
    assert.match(note, /the id X differs only in case/)
    assert.doesNotMatch(note, /the id \\"X\\" differs only in case/)
  }
})
