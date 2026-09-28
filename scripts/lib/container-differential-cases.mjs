export function containerDifferentialCases() {
  const cases = []
  const heads = ['a', '# H', '| a |', '+ b |', '---', '%% comment', '```', '::: box', '{.x}', '[r]: /url', '[^n]: note', '- a', '> a', ':: term\n: body']
  const prefixes = ['', '> ', '> > ', '- ', '- - ', '- > ', '> - ', '1. ']
  const add = (family, source) => cases.push({ name: `${family}-${cases.length}`, source })
  for (const prefix of prefixes) for (const head of heads)
    for (const tail of ['tail', '\ntail', '  tail', '> tail', '- tail', '+\n\ntail'])
      add('container', `${prefix}${head}\n${tail}\n`)
  for (const indent of ['', ' ', '  ', '\t']) for (const gap of ['', '\n'])
    for (const use of ['', '\n[^n]\n']) add('note', `[^n]: a\n${gap}${indent}b\n${use}`)
  for (const text of ['[x][r]', '![x][r]', '[x]', '![x]', '</#h>', '[x]{.c}', '*x', '/x', '`x', '{x', '[x](u', '^[note]'])
    for (const prefix of prefixes) for (const def of ['', '\n[r]: /url\n', '\n{#h}\n# H\n'])
      add('inline', `${prefix}${text}\n${def}`)
  return cases
}
