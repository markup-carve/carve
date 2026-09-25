/*
 * The import-report gate's subject ledger, exercised against synthetic reports
 * (carve#2279).
 *
 * The gate compared engine reports row for row, which cannot see a subject that
 * produces NO row in an engine: the shorter list paired against nothing and the
 * gate agreed with itself. These assertions delete a row from one engine's
 * report and require the refusal, which is the property the ledger adds.
 *
 * The strings are the ones the merged engines emit, copied from carve-js#2052
 * and carve-php#2391.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  auditPreservedSubjects,
  parsePreservedMessage,
} from '../scripts/lib/import-report-subjects.mjs'

const preserved = (message) => ({ code: 'attribute-preserved', message })
const KEPT = 'in the raw HTML this element is kept as'
const INSIDE = 'inside the raw HTML <form> is kept as'

const HANDLER = preserved(`Preserved event-handler attribute onclick on <form> ${KEPT}`)
const STYLE = preserved(`Preserved style with a denied URL scheme in a declaration value on <form> ${KEPT}`)
const HREF = preserved(`Preserved href with a denied URL scheme on <a> ${INSIDE}`)
const RAW = { code: 'raw-preserved', message: 'Preserved unsupported <form> element as raw HTML' }

const LEDGER = [{ key: 'form.onclick' }, { key: 'form.style' }, { key: 'a.href' }]

const threeEngines = (js, rs, php) => new Map([['js', js], ['rs', rs], ['php', php]])
const agreed = () => threeEngines(
  [HANDLER, STYLE, RAW, HREF],
  [HANDLER, STYLE, RAW, HREF],
  [HANDLER, STYLE, RAW, HREF],
)

test('the agreed reports pass, so a refusal below comes from the row that changed', () => {
  const audit = auditPreservedSubjects('case', LEDGER, agreed())
  assert.deepEqual(audit.failures, [])
  assert.deepEqual(audit.notes, [])
})

test('deleting one engine`s row is refused, and names the engine and the subject', () => {
  const reports = agreed()
  reports.set('php', [HANDLER, RAW, HREF])
  const { failures } = auditPreservedSubjects('case', LEDGER, reports)
  assert.equal(failures.length, 1)
  assert.match(failures[0], /php report no row for form\.style; js, rs do/)
})

test('a row missing from EVERY engine is refused too, which the row comparison cannot see', () => {
  const reports = threeEngines([HANDLER, RAW, HREF], [HANDLER, RAW, HREF], [HANDLER, RAW, HREF])
  const { failures } = auditPreservedSubjects('case', LEDGER, reports)
  assert.equal(failures.length, 1)
  assert.match(failures[0], /no engine reports a row for form\.style/)
})

test('restoring the row byte for byte goes green again', () => {
  const reports = agreed()
  reports.set('php', [HANDLER, RAW, HREF])
  assert.equal(auditPreservedSubjects('case', LEDGER, reports).failures.length, 1)
  reports.set('php', [HANDLER, STYLE, RAW, HREF])
  assert.deepEqual(auditPreservedSubjects('case', LEDGER, reports).failures, [])
})

test('a row no ledger entry names is refused, so the ledger cannot fall behind the report', () => {
  const reports = agreed()
  reports.set('rs', [...agreed().get('rs'), preserved(`Preserved list-valued URL attribute srcset on <img> ${INSIDE}`)])
  const { failures } = auditPreservedSubjects('case', LEDGER, reports)
  assert.equal(failures.length, 1)
  assert.match(failures[0], /rs report a row for img\.srcset, which the case's subject ledger does not name/)
})

test('a pending subject is excused in both directions', () => {
  const ledger = [...LEDGER, { key: 'img.srcset', pending: 'carve#2279' }]
  const reports = agreed()
  reports.set('rs', [...agreed().get('rs'), preserved(`Preserved list-valued URL attribute srcset on <img> ${INSIDE}`)])

  const pending = auditPreservedSubjects('case', ledger, reports)
  assert.deepEqual(pending.failures, [])
  assert.match(pending.notes[0], /PENDING case: img\.srcset - rs "list-valued URL attribute srcset"; js, php report nothing \(carve#2279\)/)
  assert.ok(pending.excused.has('img.srcset'))

  const shipped = new Map(
    [...reports].map(([engine, list]) => [engine, [...list.filter((d) => d !== RAW), preserved(`Preserved list-valued URL attribute srcset on <img> ${INSIDE}`), RAW]]),
  )
  const stale = auditPreservedSubjects('case', ledger, shipped)
  assert.equal(stale.failures.length, 1)
  assert.match(stale.failures[0], /every engine now reports img\.srcset in the pinned shape/)
})

test('a pending subject no engine reaches is refused, so the entry cannot outlive its case', () => {
  const ledger = [...LEDGER, { key: 'img.srcset', pending: 'carve#2279' }]
  const { failures } = auditPreservedSubjects('case', ledger, agreed())
  assert.equal(failures.length, 1)
  assert.match(failures[0], /no engine reports a row for img\.srcset/)
})

test('a subject naming a kind without the word attribute is refused', () => {
  const reports = agreed()
  const ledger = [...LEDGER, { key: 'form.data-carve-src' }]
  for (const engine of ['js', 'rs', 'php']) {
    reports.set(engine, [...agreed().get(engine), preserved(`Preserved round-trip marker data-carve-src on <form> ${KEPT}`)])
  }
  const { failures } = auditPreservedSubjects('case', ledger, reports)
  assert.equal(failures.length, 3)
  for (const failure of failures) {
    assert.match(failure, /spells form\.data-carve-src's subject "round-trip marker data-carve-src", which is not the pinned template/)
  }
})

test('a kind-less subject carrying the word attribute is refused', () => {
  const reports = agreed()
  const ledger = [...LEDGER, { key: 'td.align' }]
  for (const engine of ['js', 'rs', 'php']) {
    reports.set(engine, [...agreed().get(engine), preserved(`Preserved attribute align on <td> ${INSIDE}: a mapped CSS declaration already sets it`)])
  }
  const { failures } = auditPreservedSubjects('case', ledger, reports)
  assert.equal(failures.length, 3)
  assert.match(failures[0], /spells td\.align's subject "attribute align"/)
})

test('a message that is not the row skeleton at all is refused', () => {
  const reports = agreed()
  reports.set('php', [...agreed().get('php'), preserved('style was preserved')])
  const { failures } = auditPreservedSubjects('case', LEDGER, reports)
  assert.equal(failures.length, 1)
  assert.match(failures[0], /php writes a preserved row that is not/)
})

test('the template reads the emitted messages, both places a kept element can be', () => {
  for (const [message, tag, name] of [
    [`Preserved event-handler attribute onclick on <form> ${KEPT}`, 'form', 'onclick'],
    [`Preserved style with a construct the CSS sanitizer refuses on <p> ${INSIDE}`, 'p', 'style'],
    [`Preserved unsupported attribute xlink:href on <form> ${KEPT}: not spellable as a Carve attribute name`, 'form', 'xlink:href'],
    [`Preserved align on <td> ${INSIDE}: a mapped CSS declaration already sets it`, 'td', 'align'],
  ]) {
    const parsed = parsePreservedMessage(message)
    assert.deepEqual([parsed.tag, parsed.name, parsed.wellFormed], [tag, name, true], message)
  }
})
