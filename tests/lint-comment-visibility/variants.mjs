export function* commentVariants() {
  const payloads = ['**secret**', '~~secret~~', '/**/ secret', '|= secret |', '### secret']
  const siblings = ['', 'tail\n', '# tail\n', '- tail\n', '> tail\n', '|= tail |\n', '```js\ntail\n```\n', ':: term\n: tail\n', '%% tail\n', '---\n']
  const hosts = [
    (body) => body,
    (body) => body.split('\n').filter(Boolean).map((line) => `> ${line}`).join('\n') + '\n',
    (body) => '- item\n' + body.split('\n').filter(Boolean).map((line) => `  ${line}`).join('\n') + '\n',
    (body) => `::: note\n${body}:::\n`,
    (body) => `:: term\n: detail\n${body}`,
  ]
  for (const host of hosts) for (let depth = 0; depth < 4; depth++) for (const payload of payloads) for (const sibling of siblings) {
    const pad = ' '.repeat(depth)
    const inside = `${pad}%%%\n${pad}${payload}\n${pad}%%%\n`
    yield `${'::: note\n'.repeat(depth)}${host(inside)}${':::\n'.repeat(depth)}${sibling}`
  }
}
