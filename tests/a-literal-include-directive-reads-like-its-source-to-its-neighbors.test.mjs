import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('a literal include directive after # or @ stays text and leaks no mask', () => {
  assert.equal(html('#{{ v@lines:2 }}\n'), '<p>#{{ v@lines:2 }}</p>')
  assert.equal(html('@{{ v@lines:2 }}\n'), '<p>@{{ v@lines:2 }}</p>')
  assert.equal(html('#{{ v@code }}\n'), '<p>#{{ v@code }}</p>')
})

test('a backslash before a literal include directive escapes its brace', () => {
  assert.equal(html('\\{{ v@lines:2 }}\n'), '<p>{{ v@lines:2 }}</p>')
  assert.equal(html('\\\\{{ v@lines:2 }}\n'), '<p>\\{{ v@lines:2 }}</p>')
  assert.equal(html('`\\{{ v@lines:2 }}`\n'), '<p><code>\\{{ v@lines:2 }}</code></p>')
})
