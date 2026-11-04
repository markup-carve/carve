import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parse} from '../scripts/spec/layout.mjs'
import {renderDoc} from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('a span placeholder sets only its own physical column default', () => {
  for (const [marker, style] of [
    ['{<} <', 'left'], ['{~} <', 'center'], ['{>} <', 'right'],
  ]) {
    const output = html(`|={>} Price |${marker} |= Stock |\n| 12 | EUR | 3 |\n`)
    assert.match(output, /<th scope="col" colspan="2" style="text-align: right;">Price<\/th>/)
    assert.match(output, new RegExp(`<td style="text-align: ${style};">EUR<\\/td>`))
    if (marker !== '{>} <') assert.doesNotMatch(output, /<td style="text-align: right;">EUR<\/td>/)
  }
})

test('a later explicit span alignment wins and an omitted one does not reset it', () => {
  const later = html('|={>} A |{<} < |= B |\n|={<} C |{~} < |= D |\n| x | y | z |\n')
  assert.match(later, /<td style="text-align: center;">y<\/td>/)
  const omitted = html('|={>} A |{<} < |= B |\n|={<} C |< |= D |\n| x | y | z |\n')
  assert.match(omitted, /<td style="text-align: left;">y<\/td>/)
})

test('orphan row and column spans take the head row kind and retain alignment', () => {
  for (const marker of ['^', '<']) {
    const output = html(`| ${marker} |={~} Name |\n| 1 | 2 |\n`)
    assert.match(output, /<thead>/)
    assert.match(output, /<th scope="col"><\/th>/)
  }
  assert.match(html('|{~} ^|= Name |\n| 1 | 2 |\n'), /<th scope="col" style="text-align: center;"><\/th>/)
  const covered = html('| ^ | < |= Name |\n| 1 | 2 | 3 |\n')
  assert.match(covered, /<thead>/)
  assert.match(covered, /<th scope="col" colspan="2"><\/th>/)
})

test('data lookalikes remain text when the span production does not match', () => {
  assert.match(html('| <x |\n'), /<td>&lt;x<\/td>/)
  assert.match(html('|= <|\n'), /<th scope="col">&lt;<\/th>/)
  assert.match(html('| \\<< |\n'), /<td>&lt;&lt;<\/td>/)
})

test('a header-kind rowspan marker heads a row of only orphan placeholders', () => {
  for (const head of ['|=^ |', '|=< |', '|=^ | ^ |', '|=^ | < |']) {
    const output = html(`${head}\n| x | y |\n`)
    assert.match(output, /<thead>/, head)
    assert.match(output, /<th scope="col"( colspan="2")?><\/th>/, head)
  }
  assert.match(html('|={~} ^ |= a |\n| x | y |\n'), /<th scope="col" style="text-align: center;"><\/th>/)
  assert.equal(html('|= a |\n|=^ |\n'), html('|= a |\n| ^ |\n'))
  for (const data of ['| =^ |', '|=^x |', '|\\=^ |', '|=^|', '|=<|']) {
    assert.doesNotMatch(html(`${data}\n`), /<th/, data)
  }
  assert.match(html('|= ^|\n'), /<th scope="col">\^<\/th>/)
})
