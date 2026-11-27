import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('6933: published diagnostic listings stay complete', () => {
  const catalog = JSON.parse(read('../spec/0.2/data/lint-rules.json')).rules
  const validation = read('../docs/validation.md')
  const listed = validation.split('## Lint rule catalog')[1].split(/^## /m)[0]
  const listedCodes = [...listed.matchAll(/^\| `([^`]+)` \|/gm)].map(([, code]) => code)
  const activeLint = catalog.filter(({ channel, status }) => channel === 'lint' && status !== 'void')
  assert.ok(validation.includes(`The following ${activeLint.length} lint-channel rows`))
  assert.deepEqual(new Set(listedCodes), new Set(activeLint.map(({ id }) => id)))

  const writer = read('../spec/0.2/writer.md')
  const table = writer.split('### The codes of the parse channel and of the render-loss channel')[1].split(/^### /m)[0]
  const tableCodes = table.split('\n').filter((line) => line.startsWith('| `')).flatMap((line) =>
    [...line.split('|')[1].matchAll(/`([^`]+)`/g)].map(([, code]) => code))
  const sharedCodes = catalog.filter(({ channel }) => ['parse', 'render-loss'].includes(channel))
  assert.deepEqual(new Set(tableCodes), new Set(sharedCodes.map(({ id }) => id)))
})
