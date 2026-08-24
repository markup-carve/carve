import { carveToAstJson } from '@markup-carve/carve'
import { writeFileSync } from 'node:fs'
const cases = {
  'i1-indented-direct': ' ![Apollo](a.jpg)\n',
  'c1-resolved':        '![Apollo][moon]\n\n[moon]: a.jpg\n',
  'c2-collapsed':       '![Apollo][]\n\n[Apollo]: a.jpg\n',
  'c3-direct':          '![Apollo](a.jpg)\n',
  'c4-unresolved':      '![Apollo][nope]\n',
}
for (const [k,v] of Object.entries(cases)) {
  const d = carveToAstJson(v)
  writeFileSync(`/tmp/shapes-${process.env.S}/${k}.carve-js.json`, typeof d==='string'?d:JSON.stringify(d))
  writeFileSync(`/tmp/shapes-${process.env.S}/${k}.crv`, v)
}
console.log('js published trees written')
