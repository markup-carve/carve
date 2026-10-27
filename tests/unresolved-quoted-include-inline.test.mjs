import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('unresolved quoted-path code includes keep core inline parsing', () => {
  for (const path of ['a}}b', 'chapter one.crv']) {
    assert.equal(
      html(`{{ "${path}" @code }}`),
      `<p>{{ “${path}” <span class="mention"><strong>@code</strong></span> }}</p>`,
    )
  }
  assert.equal(
    html('{{ "a}}b" @code }}\n^ Caption'),
    '<p>{{ “a}}b” <span class="mention"><strong>@code</strong></span> }}</p>\n<p>^ Caption</p>',
  )
})
