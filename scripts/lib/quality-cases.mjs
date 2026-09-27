/** Deterministic combinations of container columns, attributes and import modes. */
export function sourceQualityCases() {
  const cases = []
  for (const marker of ['- payload', '1. payload', '- [x] payload']) {
    for (const fence of ['```', '~~~']) {
      for (const extra of [1, 4]) {
        for (const quoted of [false, true]) {
          const prefix = quoted ? '> ' : ''
          const lines = ['- head', '', `${' '.repeat(2 + extra)}${fence}`, `${' '.repeat(2 + extra)}body`, `  ${marker}`]
          cases.push({
            id: `fence-${cases.length}`,
            source: lines.map((line) => prefix + line).join('\n') + '\n',
            payload: `body\n${marker}\n`,
          })
        }
      }
    }
  }
  return cases
}

export function importQualityCases() {
  const cases = []
  const wrappers = [
    ['paragraph', (text) => `<p>${text}</p>`],
    ['caption', (text) => `<figure><img src="/i.png" alt="i"><figcaption>${text}</figcaption></figure>`],
    ['cell', (text) => `<table><tr><td>${text}</td></tr></table>`],
    ['description', (text) => `<dl><dt>term</dt><dd>${text}</dd></dl>`],
  ]
  for (const mode of ['safe', 'semantic', 'roundtrip']) {
    for (const [host, wrap] of wrappers) {
      for (const text of ['', '<span class="same" title="same" role="note" onclick="go()">one</span><span class="same" title="same" role="note" onclick="go()">two</span>']) {
        const span = '<span class="same" title="same" role="note">'
        const content = `${span}one</span>${span}two</span>`
        const expectedHtml = text === '' ? {
          paragraph: '', caption: '<img src="/i.png" alt="i">', cell: '',
          description: '<dl>\n  <dt>term</dt>\n  <dd></dd>\n</dl>',
        }[host] : {
          paragraph: `<p>${content}</p>`,
          caption: `<figure>\n  <img src="/i.png" alt="i">\n  <figcaption>${content}</figcaption>\n</figure>`,
          cell: `<table>\n  <tbody>\n    <tr><td>${content}</td></tr>\n  </tbody>\n</table>`,
          description: `<dl>\n  <dt>term</dt>\n  <dd>${content}</dd>\n</dl>`,
        }[host]
        const expectedCodes = text !== '' ? ['attribute-dropped', 'attribute-dropped']
          : host === 'caption' ? ['element-unwrapped'] : host === 'cell' ? ['structure-unspellable'] : []
        cases.push({ id: `${mode}-${host}-${text === '' ? 'empty' : 'repeated'}`, mode, source: wrap(text), expectedHtml, expectedCodes, expectedAttributions: text === '' ? 0 : 2 })
      }
    }
  }
  return cases
}
