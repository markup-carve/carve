import * as lib from '@markup-carve/carve'
const cases = {
  '411-1 indented direct': ' ![Apollo](a.jpg)\n',
  '412-1 resolved ref':    '![Apollo][moon]\n\n[moon]: a.jpg\n',
  '412-2 collapsed':       '![Apollo][]\n\n[Apollo]: a.jpg\n',
  '412-3 direct':          '![Apollo](a.jpg)\n',
  '412-4 unresolved':      '![Apollo][nope]\n',
}
const kinds = d => (d.children||[]).map(c=>c.type).join(',')
for (const [k,v] of Object.entries(cases)) {
  const parseOnly = kinds(lib.parse(v))                       // fresh
  const published = kinds(lib.toAstJson(lib.resolve(lib.parse(v))))  // fresh
  console.log(k.padEnd(24), 'parse-only=', parseOnly.padEnd(34), 'PUBLISHED=', published)
}
