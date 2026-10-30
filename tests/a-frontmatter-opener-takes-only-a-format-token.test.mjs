import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// PART 1 frontmatter_open = "---", [space], [frontmatter_format], newline, with
// frontmatter_format = (letter | digit)+ and trailing spaces or tabs dropped.
const opens = (line) => /^---(?: ?[A-Za-z0-9]+)?[ \t]*$/.test(line)

test('a --- line opens frontmatter only with a format token or nothing after it (carve#4386)', () => {
  const chars = []
  for (let c = 33; c < 127; c++) chars.push(String.fromCharCode(c))
  chars.push('é', '<', 'a b', 'yaml x', 'yaml-x')
  let n = 0
  for (const pad of ['', ' ', '  ', '\t', ' \t']) {
    for (const tok of ['', ...chars]) {
      for (const tail of ['', ' ', '\t', ' x']) {
        const opener = `---${pad}${tok}${tail}`
        const html = renderDoc(parse(`${opener}\nk: v\n---\np\n`))
        assert.equal(!html.includes('k: v'), opens(opener), JSON.stringify(opener))
        n++
      }
    }
  }
  assert.equal(n, 2000)
})
