// The playground's Format action: rewrite Carve source through the canonical
// writer of the selected engine. The vendored WASM build is rendering-only and
// has no writer export, so Rust mode falls back to carve-js and says so.

/** The writer export a carve-wasm module offers, or null when the build omits it. */
export function wasmWriter(mod) {
  return mod && typeof mod.toCarveWithOptions === 'function' ? mod.toCarveWithOptions : null
}

/**
 * @param {string} source
 * @param {{ engine: 'js' | 'rust', alignTables: boolean,
 *   jsFormat: (source: string, options: object) => string,
 *   wasmFormat: ((source: string, options: object) => string) | null }} opts
 * @returns {{ text: string, engine: 'js' | 'rust', fellBack: boolean }}
 */
export function formatCarve(source, { engine, alignTables, jsFormat, wasmFormat }) {
  const options = { alignTables: alignTables === true }
  if (engine === 'rust' && wasmFormat) {
    return { text: wasmFormat(source, options), engine: 'rust', fellBack: false }
  }
  return { text: jsFormat(source, options), engine: 'js', fellBack: engine === 'rust' }
}
