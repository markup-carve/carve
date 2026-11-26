// The "Extensions" section of the readiness report: the standard extension corpus per engine and extension.
// Extension outcomes use the same readiness gate as the core conformance areas.
export function extensionFailures(results) {
  return Object.entries(results).flatMap(([engine, rows]) => rows
    .filter(row => row.status !== 'pass')
    .map(row => `${engine}/extensions/${row.kind}/${row.id}: ${row.status}`))
}

// With a baseline, extension cases are gated per case by classify like clause cases, so a changed expectation is a gap.
export const extensionGate = (failures, compared) => compared ? [] : failures

export function extensionReport(cases, results) {
  const names = [...new Set(cases.map(c => c.extension))].sort()
  const engines = Object.keys(results)
  const lines = ['## Extensions', '',
    `The standard extension corpus (\`spec/0.2/conformance/extensions.json\`, ${cases.length} cases) counts toward Engine ready. A failed or unsupported case fails readiness.`, '',
    `| Extension | Cases | ${engines.map(e => `${e} pass | ${e} fail | ${e} unsupported`).join(' | ')} |`,
    `|---|---:|${engines.map(() => '---:|---:|---:').join('|')}|`]
  const tally = (engine, name) => {
    const rows = results[engine].filter(r => name === undefined || r.extension === name)
    return ['pass', 'fail', 'unsupported'].map(status => rows.filter(r => r.status === status).length)
  }
  for (const name of names) lines.push(`| ${name} | ${cases.filter(c => c.extension === name).length} | ${engines.map(e => tally(e, name).join(' | ')).join(' | ')} |`)
  lines.push(`| **Total** | ${cases.length} | ${engines.map(e => tally(e).join(' | ')).join(' | ')} |`)
  for (const engine of engines) {
    const bad = results[engine].filter(r => r.status !== 'pass')
    if (bad.length) lines.push('', `${engine} extension cases not passing: ${bad.map(r => `\`${r.id}\` (${r.status}: ${r.fields.join(', ')})`).join(', ')}.`)
  }
  return lines
}
