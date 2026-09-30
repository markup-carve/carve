import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'

export function compareCharacterSlots(ebnf, ohmSource, slots) {
  const grammar = ohm.grammar(ohmSource)
  const punctuation = ebnf.match(/^ascii_punctuation = ([\s\S]*?);$/m)
  if (!punctuation) throw new Error('Missing ascii_punctuation production')
  const escaped = new Set([...punctuation[1].matchAll(/'(\\|[^'])'|"([^"])"/g)]
    .map((m) => m[1] ?? m[2]))
  const repertoire = [...Array.from({ length: 128 }, (_, n) => String.fromCodePoint(n)), 'é', '中', '😀']
  const differences = []
  for (const slot of slots) {
    const production = ebnf.match(new RegExp(`^${slot.production} = ([\\s\\S]*?);$`, 'm'))
    if (!production || !/escaped_char/.test(production[1])) {
      throw new Error(`Unsupported escape production: ${slot.production}`)
    }
    const literal = [...production[1].matchAll(/\(character([^)]*)\)/g)]
      .map((m) => m[1]).find((s) => s.includes(slot.quote === '"' ? "'\"'" : '"\'"'))
    if (literal === undefined) throw new Error(`Missing character class: ${slot.production}`)
    const exclusions = [...literal.matchAll(/-\s*(?:'([^']*)'|"([^"]*)"|(newline))/g)]
      .flatMap((m) => m[3] ? ['\n', '\r'] : [m[1] ?? m[2]])
    if (exclusions.some((c) => c.length !== 1)) throw new Error(`Unsupported exclusion: ${literal}`)
    const excluded = new Set(exclusions)
    const hasBareBackslash = /literal_backslash/.test(production[1])
    if (hasBareBackslash && !/^literal_backslash = '\\', !\(ascii_punctuation\) ;$/m.test(ebnf)) {
      throw new Error('Unsupported literal_backslash guard')
    }
    for (const c of repertoire) {
      const escapeActual = grammar.match('\\' + c, slot.escapeRule).succeeded()
      if (escapeActual !== escaped.has(c)) differences.push({ ...slot, input: '\\' + c,
        expected: escaped.has(c), actual: escapeActual, kind: 'escape' })
      for (const prefix of ['', '\\']) {
        for (const suffix of ['z', '']) {
          const input = prefix + c
          const ordinaryBackslash = !excluded.has('\\') || hasBareBackslash && !escaped.has(suffix || slot.quote)
          const raw = c === '\\' ? ordinaryBackslash : !excluded.has(c)
          const expected = prefix ? escaped.has(c) || hasBareBackslash && !escaped.has(c) && !excluded.has(c) : raw
          // Layout normalizes line endings before the Ohm grammar reads them.
          const actual = grammar.match(slot.quote + input.replaceAll('\r', '\n') + suffix + slot.quote, slot.rule).succeeded()
          if (actual !== Boolean(expected)) differences.push({ ...slot, input, suffix, expected: Boolean(expected), actual })
        }
      }
    }
  }
  return differences
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url)
  const read = (path) => readFileSync(new URL(path, root), 'utf8')
  const differences = compareCharacterSlots(read('resources/grammar.ebnf'), read('resources/carve-core.ohm'),
    JSON.parse(read('resources/grammar-character-slots.json')))
  if (differences.length) {
    console.error(JSON.stringify(differences, null, 2))
    process.exitCode = 1
  } else console.log('Quoted attribute and title character classes match their productions.')
}
