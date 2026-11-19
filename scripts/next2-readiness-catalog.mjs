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
    for (const diagnostic of [...(rows[index]?.diagnostics ?? []), ...(rows[index]?.stdoutDiagnostics ?? []), ...(rows[index]?.stderrDiagnostics ?? [])]) {
      if (excluded.has(diagnostic.code)) found.push(`${engine}/${c.id}: ${diagnostic.code}`)
    }
  })
  return found
}
