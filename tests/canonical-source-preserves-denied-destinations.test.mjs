import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  carveToCarveWithReport, carveToHtml, carveToMarkdown, carveToHtmlWithReport,
  carveToMarkdownWithReport, parse, toAstJson,
} from '@markup-carve/carve'

const grammar = readFileSync(new URL('../resources/grammar.ebnf', import.meta.url), 'utf8')
const start = grammar.indexOf('renderer MUST reject any URL whose scheme is')
const end = grammar.indexOf('Ordinary web and contact schemes', start)
assert.ok(start >= 0 && end > start)
const denied = [...new Set([...grammar.slice(start, end).matchAll(/`([a-z][a-z0-9+.-]*)`/g)].map(m => m[1]))]
assert.ok(denied.length >= 20)

function meaning(source) {
  return JSON.parse(JSON.stringify(toAstJson(parse(source)), (key, value) => key === 'pos' || key === 'srcByteLength' ? undefined : value))
}

for (const scheme of denied) {
  test(`canonical source preserves ${scheme} while presentation sinks blank it`, () => {
    const destination = `${scheme}:payload`
    const source = `[x](${destination}) ![i](${destination}) <${destination}>\n`
    const written = carveToCarveWithReport(source, { strictLosses: true })
    assert.deepEqual(meaning(written.value), meaning(source))
    assert.equal(carveToCarveWithReport(written.value).value, written.value)
    const children = meaning(written.value).children[0].children
    assert.equal(children.find(node => node.type === 'link').href, destination)
    assert.equal(children.find(node => node.type === 'image').src, destination)
    assert.equal(children.find(node => node.type === 'autolink').href, destination)
    assert.deepEqual(written.losses, [])
    assert.equal(written.totalLosses, 0)
    assert.equal(written.truncated, false)
    for (const render of [carveToHtmlWithReport, carveToMarkdownWithReport]) {
      for (const allowRawHtml of [false, true]) {
        const result = render(written.value, { allowRawHtml })
        assert.deepEqual(result.losses.map(loss => loss.code), ['destination-denied', 'destination-denied', 'destination-denied'])
      }
    }
    assert.equal(carveToHtml(written.value), `<p><a href="">x</a> <img src="" alt="i"> <a href="">${destination}</a></p>`)
    assert.equal(carveToMarkdown(written.value), `[x]() ![i]() [${destination}]()\n`)
  })
}

test('a denied reference destination survives canonical writing', () => {
  const source = '[x][r]\n\n[r]: javascript:payload\n'
  const written = carveToCarveWithReport(source, { strictLosses: true })
  assert.deepEqual(meaning(written.value), meaning(source))
  assert.equal(written.totalLosses, 0)
  assert.equal(carveToHtml(written.value), '<p><a href="">x</a></p>')
})

test('the reported parenthesized destination preserves its parse meaning', () => {
  const source = '[x](javascript:alert(1))\n'
  const written = carveToCarveWithReport(source, { strictLosses: true })
  assert.deepEqual(meaning(written.value), meaning(source))
  assert.equal(written.value, source)
  assert.equal(written.totalLosses, 0)
  assert.match(written.value, /^\[x\]\(javascript:/)
  assert.equal(carveToHtml(written.value), '<p><a href="">x</a></p>')
})

test('the sink clause names canonical source and its downstream obligation', () => {
  const section = readFileSync(new URL('../resources/spec/16-semantics-comments-security.ebnf', import.meta.url), 'utf8')
  assert.match(section, /CANONICAL CARVE SOURCE IS AN INTERCHANGE FORM, NOT A URL SINK/)
  assert.match(section, /MUST preserve\s+authored destinations/)
  assert.match(section, /consumer that renders either interchange form MUST\s+apply this clause at its own URL sinks/)
})

for (const source of [
  '[x](JaVaScRiPt:payload)\n',
  '[x](/safe){href=javascript:payload} ![i](/safe){src=vbscript:payload}\n',
  '![i](/safe){srcset="safe.png 1x,javascript:payload 2x"}\n',
]) test(`canonical source preserves authored URL fields: ${source.trim()}`, () => {
  const written = carveToCarveWithReport(source, { strictLosses: true })
  assert.deepEqual(meaning(written.value), meaning(source))
  assert.equal(written.totalLosses, 0)
  assert.equal(carveToHtml(written.value), carveToHtml(source))
  assert.equal(carveToMarkdown(written.value), carveToMarkdown(source))
})

for (const scheme of ['javascript', 'JaVaScRiPt', 'vbscript', 'data', 'file', 'ms-msdt', 'vscode']) {
  for (const tail of ['alert(1)', 'a(b(c))d', 'a\\)b', 'a\\(b', 'a\\\\b']) {
    test(`canonical source retains escape semantics: ${scheme}:${tail}`, () => {
      const source = `[x](${scheme}:${tail}) ![i](${scheme}:${tail})\n`
      const written = carveToCarveWithReport(source, { strictLosses: true })
      assert.deepEqual(meaning(written.value), meaning(source))
      assert.equal(carveToCarveWithReport(written.value).value, written.value)
      assert.equal(written.totalLosses, 0)
      assert.equal(carveToHtml(written.value), carveToHtml(source))
      assert.equal(carveToMarkdown(written.value), carveToMarkdown(source))
    })
  }
}
