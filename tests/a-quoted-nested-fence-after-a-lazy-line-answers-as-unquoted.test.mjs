import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'

const releasesFlush = source => {
  const last = parse(source).blocks.at(-1)
  return last?.t === 'para' && last.lines.join('') === 'flush'
}

for (const depth of [1, 2, 3]) {
  for (const nesting of [1, 2]) for (const lazyColumn of [0, 1]) {
    for (const character of ['`', '~']) for (const closed of [false, true]) {
      for (const blank of [false, true]) {
        test(`quoted lazy fence: depth=${depth}, nesting=${nesting}, column=${lazyColumn}, fence=${character}, closed=${closed}, blank=${blank}`, () => {
          const fence = character.repeat(3)
          const indent = ' '.repeat(2 * (nesting + 1))
          const lines = ['- a', '  - c']
          if (nesting === 2) lines.push('    - d')
          lines.push(' '.repeat(lazyColumn) + 'b')
          if (blank) lines.push('')
          lines.push(indent + fence, indent + 'y')
          if (closed) lines.push(indent + fence)
          const unquoted = lines.join('\n') + '\nflush\n'
          const quoted = lines.map(line => ('> '.repeat(depth) + line).trimEnd()).join('\n') + '\nflush\n'
          assert.equal(releasesFlush(quoted), releasesFlush(unquoted), quoted)
        })
      }
    }
  }
}
