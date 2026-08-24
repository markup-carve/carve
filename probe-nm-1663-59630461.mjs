import { parse } from '@markup-carve/carve'
const cases = {
  '411-1 indented direct': ' ![Apollo](a.jpg)\n',
  '412-1 resolved ref':    '![Apollo][moon]\n\n[moon]: a.jpg\n',
  '412-3 direct':          '![Apollo](a.jpg)\n',
}
for (const [k,v] of Object.entries(cases)) console.log(k.padEnd(24), (parse(v).children||[]).map(c=>c.type))
