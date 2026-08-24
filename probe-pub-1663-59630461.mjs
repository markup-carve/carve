import * as lib from '@markup-carve/carve'
const cases = {
  '411-1 indented direct': ' ![Apollo](a.jpg)\n',
  '411-2 indented ref':    ' ![Apollo][moon]\n\n[moon]: a.jpg\n',
  '412-1 resolved ref':    '![Apollo][moon]\n\n[moon]: a.jpg\n',
  '412-2 collapsed':       '![Apollo][]\n\n[Apollo]: a.jpg\n',
  '412-3 direct':          '![Apollo](a.jpg)\n',
  '412-4 unresolved':      '![Apollo][nope]\n',
}
for (const [k,v] of Object.entries(cases)) {
  const parsed = lib.parse(v)
  const resolved = typeof lib.resolve === 'function' ? lib.resolve(parsed) : parsed
  const doc = lib.toAstJson(resolved)
  console.log(k.padEnd(24), 'parse=', (parsed.children||[]).map(c=>c.type).join(','),
              '  PUBLISHED=', (doc.children||[]).map(c=>c.type).join(','))
}
