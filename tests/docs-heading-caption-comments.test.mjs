import test from 'node:test'
import assert from 'node:assert/strict'
import { createHighlighter } from 'shiki'
import { carveGrammar } from '@markup-carve/carve-grammars/shiki'

const highlighter = await createHighlighter({ themes: ['github-dark', 'github-light'], langs: [carveGrammar] })
test.after(() => highlighter.dispose())

function tokenAt(source, needle, theme) {
  const at = source.indexOf(needle)
  assert.ok(at >= 0, needle)
  const lines = highlighter.codeToTokensBase(source, {
    lang: 'carve', theme, includeExplanation: 'scopeName',
  })
  for (const token of lines.flat()) {
    if (at < token.offset || at >= token.offset + token.content.length) continue
    assert.ok(token.explanation?.length, `Missing explanation for ${needle}`)
    let offset = token.offset
    for (const segment of token.explanation) {
      const end = offset + segment.content.length
      if (offset <= at && at < end) {
        const scopes = segment.scopes.map(scope => scope.scopeName)
        return { scopes: scopes.join(' '), leaf: scopes.at(-1), color: token.color }
      }
      offset = end
    }
  }
  assert.fail(`No token for ${needle}`)
}

for (const theme of ['github-dark', 'github-light']) {
  for (const prefix of ['# a ', '> # a ', '![alt](x.png)\n^ cap ', '> ![alt](x.png)\n> ^ cap ']) {
    for (const code of ['`x %% b`', '``x %% b``', '!`x %% b`', '$`x %% b`', '`x %% b']) {
      test(`${theme}: percent runs stay verbatim in ${prefix.trim()} ${code}`, () => {
        const source = prefix + code + '\n\nplain tail'
        const token = tokenAt(source, '%%', theme)
        const scope = token.scopes
        assert.doesNotMatch(scope, /comment/)
        assert.match(token.leaf, /^markup\.(?:raw|math)(?:\.|$)/)
        assert.match(scope, prefix.startsWith('> ') ? /markup\.quote/ : prefix.includes('^ cap') ? /caption/ : /heading/)
        assert.doesNotMatch(tokenAt(source, 'plain tail', theme).scopes, /heading|caption|comment|code|string/)
      })
    }
    for (const body of ['a%%b', '`x`%% b', 'a %% hidden']) {
      test(`${theme}: separator controls in ${prefix.trim()} ${body}`, () => {
        const source = prefix + body
        const token = tokenAt(source, '%%', theme)
        if (body === 'a %% hidden') {
          assert.match(token.leaf, /^comment\./)
          assert.equal(token.color, tokenAt('a %% hidden', '%%', theme).color)
        } else assert.doesNotMatch(token.scopes, /comment/)
        assert.match(tokenAt(source, prefix.includes('^ cap') ? 'cap' : 'a ', theme).scopes, prefix.startsWith('> ') ? /markup\.quote/ : prefix.includes('^ cap') ? /caption/ : /heading/)
      })
    }
    for (const gap of [' ', '\t']) {
      test(`${theme}: trailing comments follow closed code in ${prefix.trim()} with ${JSON.stringify(gap)}`, () => {
        const source = prefix + '`x`' + gap + '%% hidden'
        const token = tokenAt(source, '%%', theme)
        assert.match(token.leaf, /^comment\./)
        assert.equal(token.color, tokenAt('a %% hidden', '%%', theme).color)
        assert.match(tokenAt(source, prefix.includes('^ cap') ? 'cap' : 'a ', theme).scopes, prefix.startsWith('> ') ? /markup\.quote/ : prefix.includes('^ cap') ? /caption/ : /heading/)
        assert.doesNotMatch(tokenAt(source, 'x`', theme).scopes, /comment/)
      })
    }
  }
}
