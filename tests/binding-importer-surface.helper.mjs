/*
 * The reader behind resources/binding-contract.json's out-of-scope entries.
 *
 * An out-of-scope entry is a NEGATIVE claim, and the check that stood here read
 * it with one pre-guessed identifier per binding per format in one pre-named
 * file - `From(?:Djot|DJOT)` in carve-go/carve.go, `migrateDjot` in
 * carve-wasm/src/lib.rs. Both halves of that are a guess about a binding that
 * has not written the importer yet: carve-wasm spells its Djot entry point
 * `migrateDjot` while carve-go would spell the same thing `FromDjot`, so a Go
 * importer landing as `MigrateDjot`, or in a new file beside carve.go, matched
 * nothing and the stale out-of-scope entry stayed green.
 *
 * So the surface is DISCOVERED (every source path in the tree, not one name)
 * and the negative claim is read as a keyword tripwire instead of an identifier
 * probe. A binding cannot convert Djot without the token `djot` appearing in
 * the code that does it, whatever the export is called.
 *
 * The tripwire's own positive control is in the same function: an implemented
 * format whose keyword is absent is a finding too, so a source set that came
 * back empty - a renamed directory, a filter that stopped matching - fails
 * loudly rather than passing every negative claim vacuously.
 */

const SOURCE_EXTENSION = /\.(go|rs|rb|py|pyi)$/
const NOT_THE_SURFACE = /(^|\/)(tests?|spec|scripts)\/|_test\.(go|rb)$|(^|\/)test_[^/]*\.py$/

/*
 * Tests and helper scripts are excluded deliberately: both name the formats a
 * binding does NOT import (carve-rb's gemspec and one test comment mention Djot
 * to contrast Carve's emphasis rules), and neither can export an API.
 */
export const isBindingSource = (path) =>
  SOURCE_EXTENSION.test(path) && !NOT_THE_SURFACE.test(path)

/*
 * These are not equally sharp. `djot` and `bb_code` occur only where something
 * handles that format; `html` and `markdown` occur in every binding anyway, via
 * `ToHTML` and `to_markdown`, so an entry calling either out of scope would trip
 * on a render target. Nothing declares those two out of scope today, and the
 * first entry that needs to will also need a way to name a mention that is not
 * an importer. A false alarm is possible here; false silence is not.
 */
const FORMAT_KEYWORD = {
  html: /html/i,
  markdown: /markdown/i,
  djot: /djot/i,
  bbcode: /bb[_-]?code/i,
}

/*
 * One per binding, because each wraps carve-rs through a different FFI idiom
 * and "exported" means something different in each. These confirm a DECLARED
 * name is really an export; nothing here depends on them to read a negative.
 */
export const exportProbe = {
  'carve-go': (name) => new RegExp(String.raw`^func\s+${name}\s*\(`, 'm'),
  'carve-py': (name) => new RegExp(String.raw`wrap_pyfunction!\s*\(\s*${name}\s*,`),
  'carve-rb': (name) => new RegExp(String.raw`^\s*def\s+(?:self\.)?${name}\b`, 'm'),
  // The name may be quoted or bare: both are valid in a wasm_bindgen attribute.
  'carve-wasm': (name) => new RegExp(String.raw`js_name\s*=\s*["']?${name}\b`),
}

const mentions = (sources, keyword) => {
  const places = []
  for (const [path, text] of sources) {
    text.split('\n').forEach((line, index) => {
      if (keyword.test(line)) places.push(`${path}:${index + 1}`)
    })
  }
  return places
}

/**
 * Read one binding's declarations against the source it actually ships.
 *
 * @param {object} binding `importers` and `outOfScopeImporters` from the contract.
 * @param {string[]} formats the contract's `optionalImporters`.
 * @param {Map<string, string>} sources discovered source path to its bytes.
 * @param {(name: string) => RegExp} probe how this binding spells an export.
 * @returns {string[]} one line per disagreement, empty when the contract holds.
 */
export function surfaceFindings({ binding, formats, sources, probe }) {
  const findings = []
  for (const format of formats) {
    const keyword = FORMAT_KEYWORD[format]
    if (!keyword) {
      findings.push(`${format}: no keyword to read this format by, so its out-of-scope entries cannot be checked`)
      continue
    }
    const places = mentions(sources, keyword)
    const declaredApi = binding.importers[format]

    if (Object.hasOwn(binding.outOfScopeImporters, format)) {
      if (places.length) {
        findings.push(
          `${format} is declared out of scope ("${binding.outOfScopeImporters[format]}") ` +
            `but the shipped surface names it at ${places.slice(0, 4).join(', ')}` +
            `${places.length > 4 ? ` and ${places.length - 4} more place(s)` : ''}. ` +
            'Move it to `importers` under its exported name, or, if those places are not an importer, ' +
            'say so on the ticket and give this file a way to record that.',
        )
      }
      continue
    }

    if (!places.length) {
      findings.push(
        `${format} is declared as implemented by \`${declaredApi}\` but no source file names the format. ` +
          `The surface this read is ${sources.size} file(s) - if that is empty or the wrong files, ` +
          'every out-of-scope claim above passed vacuously and the filter needs fixing, not the contract.',
      )
      continue
    }

    const exported = [...sources.values()].some((text) => probe(declaredApi).test(text))
    if (!exported) {
      findings.push(
        `${format} is declared as \`${declaredApi}\` but no source file exports that name. ` +
          'Either the export was renamed or the contract names something private.',
      )
    }
  }
  return findings
}
