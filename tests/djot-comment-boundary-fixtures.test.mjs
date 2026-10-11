import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parse, renderHTML} from '@djot/djot'
const fixtures = JSON.parse(readFileSync(new URL('../resources/djot-comment-boundary-fixtures.json', import.meta.url)))
for (const fixture of fixtures) test(fixture.id, () => assert.equal(renderHTML(parse(fixture.source)), fixture.html))
