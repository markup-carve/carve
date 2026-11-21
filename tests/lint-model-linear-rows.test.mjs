// carve#6305: the patterns of bare-html-tag, empty-reference-definition and the pair rows must stay linear in a
// backtracking engine, run as a RegExp interpreter runs the rows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const rule = (id) => model.rules.find((row) => row.id === id)
const compile = (source) => new RegExp(source, /\\[pu]\{/.test(source) ? 'du' : 'd')

// The patterns of `matches` tests anywhere in a node, with the subject they test.
function tests(node, found = []) {
  if (Array.isArray(node)) node.forEach((item) => tests(item, found))
  else if (node && typeof node === 'object') {
    if (Array.isArray(node.matches) && typeof node.matches[1] === 'string') found.push({ subject: node.matches[0], pattern: compile(node.matches[1]) })
    Object.values(node).forEach((value) => tests(value, found))
  }
  return found
}

function timed(run) {
  let best = Infinity
  for (let round = 0; round < 2; round++) {
    const started = performance.now()
    run()
    best = Math.min(best, performance.now() - started)
  }
  return best
}

// Fails when 8 times the input takes more than 16 times as long (and over 3 ms).
function growth(shapes, run) {
  for (const [name, [make, small, big]] of Object.entries(shapes)) {
    const a = timed(() => run(make(small)))
    const b = timed(() => run(make(big)))
    // The first slow shape ends the check, so a later and larger shape cannot hang a failing run.
    if (b > 3 && b > 16 * Math.max(a, 0.1)) return [`${name}: ${a.toFixed(2)} ms to ${b.toFixed(1)} ms`]
  }
  return []
}

const repeat = (unit, n) => unit.repeat(Math.ceil(n / unit.length))

test('bare-html-tag grows linearly', () => {
  const patterns = tests(rule('bare-html-tag').when).map((entry) => entry.pattern)
  const run = (text) => patterns.forEach((pattern) => pattern.exec(text))
  // Comments without a tag were exponential before carve#6305, so that shape stays small enough to fail fast.
  assert.deepEqual(growth({
    'a run of <': [(n) => repeat('<', n), 1024, 8192],
    'a run of < before a letter': [(n) => `${repeat('<', n)}a`, 1024, 8192],
    'comments and no tag': [(n) => repeat('<!---->', n), 84, 168],
    'an open comment of dashes': [(n) => `<!--${repeat('-', n)}`, 1024, 8192],
    '<!': [(n) => repeat('<!', n), 1024, 8192],
    '<a and spaces': [(n) => `<a${repeat(' ', n)}`, 1024, 8192],
    '<a/ repeated': [(n) => repeat('<a/', n), 1024, 8192],
    'comments and no tag, long': [(n) => repeat('<!---->', n), 8192, 65536],
  }, run), [])
})

test('empty-reference-definition grows linearly', () => {
  const patterns = tests(rule('empty-reference-definition').when).map((entry) => entry.pattern)
  const run = (text) => patterns.forEach((pattern) => pattern.exec(text))
  assert.deepEqual(growth({
    '[! repeated': [(n) => repeat('[!', n), 1024, 8192],
    'a label and no colon': [(n) => `[${repeat('a', n)}]`, 1024, 8192],
    'a label of spaced words': [(n) => `[${repeat('a ', n)}]:x`, 1024, 8192],
  }, run), [])
})

// C2-W-147, the scan without `strict`, as the rows run it.
function* pairs(text, mark) {
  let at = 0
  while (at < text.length) {
    const start = text.indexOf(mark, at)
    if (start < 0) return
    let end = text.indexOf(mark, start + mark.length + 1)
    const behind = (spot) => {
      let run = 0
      while (text[spot - 1 - run] === '\\') run++
      return run
    }
    while (end >= 0 && (/[\p{Zs}\t\n\r]/u.test(text[end - 1] ?? '') || behind(end) % 2 === 1)) end = text.indexOf(mark, end + mark.length)
    if (end < 0) return
    yield { open: [start, start + mark.length], backslashes: [start - behind(start), start] }
    at = end + mark.length
  }
}

// The value of a slice whose bounds are 0 or a group offset of the pair, relative to `start` 0.
const bound = (value, groups) => (typeof value === 'number' ? value : groups[value.sub[0].match][value.sub[0].at === 'end' ? 1 : 0])

const PAIR_ROWS = model.rules.filter((row) => row.each?.pairs !== undefined)

test('the escaped-opener test of every pair row grows linearly', () => {
  assert.ok(PAIR_ROWS.length >= 8)
  for (const row of PAIR_ROWS) {
    const mark = row.each.pairs[1]
    const escape = tests(row.report).find((entry) => entry.subject.slice?.[1] === 0 || entry.subject.slice?.[1]?.sub?.[0]?.match === 'backslashes')
    assert.ok(escape, `${row.id}: no escaped-opener test`)
    const run = (text) => {
      for (const groups of pairs(text, mark)) {
        escape.pattern.test(text.slice(bound(escape.subject.slice[1], groups), bound(escape.subject.slice[2], groups)))
      }
    }
    const pair = `${mark}a${mark} `
    assert.deepEqual(growth({
      'pairs': [(n) => repeat(pair, n), 1024, 8192],
      'escaped pairs': [(n) => repeat(`\\${pair}`, n), 1024, 8192],
      'backslashes before one pair': [(n) => `${repeat('\\', n)}${pair}`, 1024, 8192],
    }, run), [], row.id)
  }
})

test('the escaped-opener test reads an odd run of backslashes before the opener', () => {
  for (const row of PAIR_ROWS) {
    const mark = row.each.pairs[1]
    const escape = tests(row.report).find((entry) => entry.subject.slice?.[1]?.sub?.[0]?.match === 'backslashes')
    assert.ok(escape, `${row.id}: the test does not read the group backslashes`)
    const escaped = (before) => {
      const text = `${before}${mark}a${mark}`
      const [groups] = pairs(text, mark)
      return escape.pattern.test(text.slice(bound(escape.subject.slice[1], groups), bound(escape.subject.slice[2], groups)))
    }
    assert.deepEqual(['', 'x', '\\', '\\\\', '\\\\\\', 'x\\', 'x\\\\'].map(escaped), [false, false, true, false, true, true, false], row.id)
  }
})
