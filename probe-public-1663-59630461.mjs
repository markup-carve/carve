import { carveToAstJson } from '@markup-carve/carve'
const cases = {
  '411-1 indented direct': ' ![Apollo](a.jpg)\n',
  '412-1 resolved ref':    '![Apollo][moon]\n\n[moon]: a.jpg\n',
  '412-2 collapsed':       '![Apollo][]\n\n[Apollo]: a.jpg\n',
  '412-3 direct':          '![Apollo](a.jpg)\n',
  '412-4 unresolved':      '![Apollo][nope]\n',
}
for (const [k,v] of Object.entries(cases)) {
  const d = carveToAstJson(v)
  const doc = typeof d === 'string' ? JSON.parse(d) : d
  console.log(k.padEnd(24), (doc.children||[]).map(c=>c.type).join(','))
}
