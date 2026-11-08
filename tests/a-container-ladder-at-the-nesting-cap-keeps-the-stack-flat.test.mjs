// carve#5547: nesting up to MAX_NESTING_DEPTH must not grow the JS call stack per level.
// The child runs on a deliberately small stack, so a per-level frame cost fails on every run
// instead of only when the parse happens to start cold.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const layout = fileURLToPath(new URL('../scripts/spec/layout.mjs', import.meta.url))
const depth = 205

const ladders = {
  bullet: Array.from({ length: depth }, (_, i) => ' '.repeat(2 * i) + '- x').join('\n') + '\n',
  ordered: Array.from({ length: depth }, (_, i) => ' '.repeat(3 * i) + '1. x').join('\n') + '\n',
  quote: Array.from({ length: depth }, (_, i) => '> '.repeat(i + 1) + 'x').join('\n') + '\n',
  'quote in item': Array.from({ length: depth }, (_, i) => ' '.repeat(4 * i) + '- > x').join('\n') + '\n',
  div: Array.from({ length: depth }, (_, i) => ':'.repeat(3 + depth - i) + ' note').join('\n') + '\nx\n' +
    Array.from({ length: depth }, (_, i) => ':'.repeat(4 + i)).join('\n') + '\n',
}

for (const [name, src] of Object.entries(ladders)) {
  test(`${name} ladder past the nesting cap parses on a 300 KB stack`, () => {
    const script = `import(${JSON.stringify(layout)}).then(({ parse }) => { parse(${JSON.stringify(src)}); console.log('ok') })`
    const run = spawnSync(process.execPath, ['--stack-size=300', '--input-type=module', '-e', script], { encoding: 'utf8' })
    assert.equal(run.stderr.includes('RangeError'), false, run.stderr.slice(0, 400))
    assert.equal(run.stdout.trim(), 'ok', run.stderr.slice(0, 400))
  })
}
