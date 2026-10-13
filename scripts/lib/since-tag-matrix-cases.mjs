import { miscount } from '../spec/participants.mjs'

export function sinceTagMatrixCases() {
  const cases = []
  const add = (matrix, id, lines) => cases.push({ matrix, id: `${matrix}-${id}`, source: `${lines.join('\n')}\n` })

  const payloadHosts = [
    ['quote', ['> a `x PAYLOAD'], ['> a', '> ', '> ```', '> x PAYLOAD']],
    ['bullet', ['- a `x PAYLOAD'], ['- a', '', '  ```', '  x PAYLOAD']],
    ['definition', [':: t', ': a `x PAYLOAD'], [':: t', ': a', '  ```', '  x PAYLOAD']],
    ['footnote', ['[^1]: a `x PAYLOAD'], ['[^1]: a', '    ```', '    x PAYLOAD']],
  ]
  for (const [host, span, fence] of payloadHosts) {
    for (const [form, lines] of [['span', span], ['fence', fence]]) {
      for (const [payload, value] of [['line', '%%'], ['block', '%%%'], ['control', 'zz']]) {
        add('payload', `${host}-${form}-${payload}`, [...lines.map(line => line.replace('PAYLOAD', value)), 'b'])
      }
    }
  }
  const payloadCount = cases.filter(c => c.matrix === 'payload').length
  const missing = miscount({ label: 'since-tag payload matrix', actual: payloadCount, expected: 24 })
  if (missing) throw new Error(missing)

  const attributes = [
    ['above-term', ['{.a}', ':: t', ': d']],
    ['after-term', [':: t {.a}', ': d']],
    ['between-term-body', [':: t', '{.a}', ': d']],
    ['above-body-marker', [':: t', '  {.a}', ': d']],
    ['inside-body', [':: t', ': d', '  {.a}']],
    ['body-column-zero', [':: t', ': d', '{.a}']],
    ['after-nested-term', [':: outer', ': :: inner', '  {.a}', '  : d']],
  ]
  for (const [id, lines] of attributes) add('attribute', id, lines)
  for (const [host, opener, content] of [
    ['quote', '> a', '> b'],
    ['bullet', '- a', '  b'],
    ['ordered', '1. a', '   b'],
    ['footnote', '[^1]: a', '    b'],
    ['admonition', '::: note', 'a'],
  ]) {
    add('attribute', `${host}-above-opener`, ['{.a}', opener, content])
    add('attribute', `${host}-trailing`, [opener, content, '{.a}'])
  }
  for (const [host, opener, column] of [
    ['quote', ['> a'], '> '],
    ['bullet', ['- a'], '  '],
    ['ordered', ['1. a'], '   '],
    ['definition', [':: t', ': a'], '  '],
    ['footnote', ['[^1]: a'], '    '],
    ['admonition', ['::: note', 'a'], ''],
  ]) {
    for (const [follower, line] of [
      ['plain', 'b'], ['comment', '%% c'], ['attribute', '{.a}'],
      ['body', ': d'], ['bullet', '- x'], ['quote', '> q'],
      ['fence', '```'], ['admonition', ':::'], ['table', '| t |'],
      ['heading', '# h'], ['reference', '[r]: /u'],
    ]) {
      for (const [position, prefix] of [['zero', ''], ['content', column]]) {
        add('admission', `${host}-${follower}-${position}`, [...opener, `${prefix}${line}`])
      }
    }
  }
  for (const [term, opening] of [
    ['single', [':: term']],
    ['wrapped', [':: A term that', '   wraps']],
  ]) {
    for (const [follower, line] of [
      ['plain', 'next'], ['blank', ''], ['comment', '%% c'],
      ['attribute', '{.a}'], ['body', ': body'], ['bullet', '- x'],
      ['fence', '```'], ['term', ':: next'], ['continuation', '+'],
    ]) {
      for (const [position, prefix] of [['zero', ''], ['indented', '  ']]) {
        add('term-break', `${term}-${follower}-${position}`, [...opening, `${prefix}${line}`, ': d'])
      }
    }
  }
  return cases
}
