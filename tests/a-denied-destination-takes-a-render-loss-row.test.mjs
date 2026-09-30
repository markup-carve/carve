/*
 * A blanked destination has a render-loss code, and the wire shape is closed
 * around it.
 *
 * PART 9 section 25 blanks a denied scheme on every clickable sink, and until
 * carve#2679 no clause said the render direction owed a row for it: every engine
 * blanked the destination and reported nothing, so `toHtmlWithReport` was silent
 * about the one link a consumer of untrusted input most wants told about.
 *
 * The code is `destination-denied`, and it lives in the render channel because
 * carve#2245 split the two reports by WHEN the loss happens. A blanked
 * destination is spellable, so the conversion channel would be the wrong home.
 *
 * Both directions are checked. An enum entry alone would accept an entry naming
 * a `format` it cannot have, and the refusals below are what make the third
 * `oneOf` branch load-bearing rather than decorative.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(repo, 'resources/render-loss-report.schema.json'), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)

const pos = { startLine: 1, endLine: 1, startColumn: 1, endColumn: 30, startOffset: 0, endOffset: 29 }
const row = {
  code: 'destination-denied',
  target: 'html',
  nodeType: 'inline',
  message: 'Blanked a denied destination scheme',
  pos,
}
const report = (...losses) => ({ losses, totalLosses: losses.length, truncated: false })

test('the render channel accepts a blanked destination row', () => {
  assert.equal(validate(report(row)), true, JSON.stringify(validate.errors))
})

test('both sinks in one render take one row each', () => {
  /* The corpus pair 536 is the authored input: one denied link and one denied
   * image in a single document. */
  const image = { ...row, message: 'Blanked a denied image source' }
  const two = report(row, image)
  assert.equal(validate(two), true, JSON.stringify(validate.errors))
  assert.equal(two.totalLosses, 2)
})

test('a blanked destination row carrying a format is refused', () => {
  /* `format` belongs to `raw-format-dropped`. A denied destination has no
   * format, so an entry naming one describes a loss that did not happen. */
  assert.equal(validate(report({ ...row, format: 'html' })), false)
})

test('a blanked destination row is refused at block level', () => {
  /* Every clickable sink is an inline node: a link, an autolink, an image. */
  assert.equal(validate(report({ ...row, nodeType: 'block' })), false)
})

test('the enum still refuses an unknown code and an unknown key', () => {
  assert.equal(validate(report({ ...row, code: 'destination-blanked' })), false)
  assert.equal(validate(report({ ...row, scheme: 'javascript' })), false)
})
