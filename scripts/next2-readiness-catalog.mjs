export function catalogRole(status) {
  if (status === 'obsolete' || status === 'void') return 'excluded'
  if (status === 'engine-local') return 'engine-local'
  return 'shared'
}

export function forbiddenCatalogReports(cases, outputs, rules) {
  const excluded = new Set(rules.filter(rule => catalogRole(rule.status) === 'excluded').map(rule => rule.id))
  const found = []
  for (const [engine, rows] of Object.entries(outputs)) cases.forEach((c, index) => {
    if (c.area !== 'clauses') return
    const actual = rows[index] ?? {}
    const jsonDiagnostics = [...(actual.stdoutJson?.diagnostics ?? []), ...(actual.stdoutJson?.files ?? []).flatMap(file => file.diagnostics ?? [])]
    for (const diagnostic of [...(actual.diagnostics ?? []), ...(actual.stdoutDiagnostics ?? []), ...(actual.stderrDiagnostics ?? []), ...jsonDiagnostics]) {
      if (excluded.has(diagnostic.code)) found.push(`${engine}/${c.id}: ${diagnostic.code}`)
    }
  })
  return found
}
