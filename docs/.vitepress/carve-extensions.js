// The single source of truth for which carve-js extensions the docs surfaces
// turn on. Shared by the runtime Playground render and the build-time
// vite-plugin-carve render so both surfaces match.
//
// carve-js ships a growing set of extension factories. To keep this list from
// silently falling out of date as new ones land, EVERY exported extension
// factory must be classified here as either ENABLED (shown in the docs) or
// EXCLUDED (deliberately off, with a reason). The `unclassifiedExtensions()`
// guard below detects any factory that is neither, and a CI test fails until a
// maintainer files it. See tests/playground-extensions.test.mjs.
//
// The extension objects are imported from the vendored carve-lib (kept in sync
// via `npm run sync-carve-lib`) so they come from the same Carve build the
// Playground renders with.
import {
  details,
  mermaid,
  mathBlock,
  spoiler,
  chart,
  wikilinks,
  autolink,
  codeGroup,
  tabs,
  listTable,
  headingPermalinks,
  citations,
  externalLinks,
} from './carve-lib/index.js'

import * as lib from './carve-lib/index.js'

// The showcase set: authoring features a visitor actually writes, each of
// which works zero-config and has a visible effect on the demo render.
//
//   - details, mermaid, mathBlock, codeGroup, tabs: block authoring constructs.
//   - wikilinks, autolink: inline link sugar.
//   - listTable: `::: list-table` renders as a real <table> with block cells.
//   - headingPermalinks: per-heading ¶ anchor (shown on hover, see custom.css).
//   - citations: `[@key]` citation rendering.
//   - externalLinks: marks off-site links (adds rel/target).
const ENABLED = [
  'details',
  'mermaid',
  'mathBlock',
  'spoiler',
  'chart',
  'wikilinks',
  'autolink',
  'codeGroup',
  'tabs',
  'listTable',
  'headingPermalinks',
  'citations',
  'externalLinks',
]

// Every carve-js extension factory that we deliberately do NOT enable, each
// mapped to a short reason. Three reasons keep an extension off, grouped below:
//
//   1. DENYLIST — extensions we never want in the inline preview even though
//      they work, because they clutter or fight the embedded render. This is
//      the explicit "do not put in the playground" list; add here to ban one.
//   2. Needs configuration, or has no visible effect in a zero-config preview.
//   3. A FencedRender preset whose client library the docs don't load (only
//      `chart` + `mermaid` are wired up).
const EXCLUDED = {
  // 1. Denylist — deliberately kept out of the playground.
  tableOfContents: 'DENY: auto-injects a TOC list that clutters the inline preview',

  // 2. Need config / no zero-config visible effect.
  defaultAttributes: 'needs per-document default-attribute config',
  headingLevelShift: 'needs a shift-amount option',
  headingReference: 'needs config / overlaps core cross-references',
  tabNormalize: 'invisible whitespace transform, nothing to show',
  glossary: 'needs a ::: glossary definition block plus :term[…] uses, nothing to show zero-config',
  index: 'needs :index[…] markers plus a ::: index block, nothing to show zero-config',
  tocPlacement: 'needs a ::: toc block plus document headings, nothing to show zero-config',
  colorSwatch: 'needs :color[…] markers, nothing to show zero-config',
  headingNumbers: 'needs section-numbering config / overlaps core heading numbering',
  codeCallouts: 'needs <n> markers inside a fenced code block plus a bound list, nothing to show zero-config',
  imgFence: 'needs an ```img``` fence with an SVG body to show anything zero-config; js-first extension (spec/docs deferred)',

  // 3. FencedRender presets with no client library loaded in the docs.
  d2: 'needs the D2 client library, not loaded in the docs',
  graphviz: 'needs a Graphviz/Viz.js client library, not loaded in the docs',
  plantuml: 'needs the PlantUML client library, not loaded in the docs',
  wavedrom: 'needs the WaveDrom client library, not loaded in the docs',
  abc: 'needs the abcjs client library, not loaded in the docs',
  vegaLite: 'needs the Vega-Lite client library, not loaded in the docs',
}

// Map of factory name -> imported factory, so the guard can introspect them
// without re-importing. (The ENABLED entries are pulled from this lib import.)
const ENABLED_FACTORIES = {
  details,
  mermaid,
  mathBlock,
  spoiler,
  chart,
  wikilinks,
  autolink,
  codeGroup,
  tabs,
  listTable,
  headingPermalinks,
  citations,
  externalLinks,
}

/** Construct a fresh array of the demo-useful extensions (defaults only). */
export function carveExtensions() {
  return ENABLED.map((name) => ENABLED_FACTORIES[name]())
}

// The lifecycle hook keys an extension object may carry (extension contract).
// An object that exposes its `name` plus at least one of these is an extension.
const HOOK_KEYS = [
  'matchInline',
  'matchBlock',
  'afterParse',
  'beforeRender',
  'renderers',
  'blockRenderers',
  'inlineRenderers',
]

/**
 * True when calling `factory()` returns an extension-shaped object: a string
 * `name` plus at least one lifecycle hook. Anything that throws or returns a
 * different shape (parser/renderer helpers, profile classes, ...) is not an
 * extension factory.
 */
function looksLikeExtensionFactory(factory) {
  if (typeof factory !== 'function') return false
  let result
  try {
    result = factory()
  } catch {
    return false
  }
  if (!result || typeof result !== 'object') return false
  if (typeof result.name !== 'string' || result.name.length === 0) return false
  return HOOK_KEYS.some((key) => key in result)
}

/**
 * The guard. Introspects every export of the vendored carve-lib, detects which
 * are extension factories, and returns any factory name that is neither in
 * ENABLED nor a key of EXCLUDED. A non-empty result means a new carve-js
 * extension landed and nobody classified it for the docs — the CI guard test
 * fails until ENABLED or EXCLUDED gains an entry.
 */
export function unclassifiedExtensions() {
  const known = new Set([...ENABLED, ...Object.keys(EXCLUDED)])
  const unclassified = []
  for (const [name, value] of Object.entries(lib)) {
    if (known.has(name)) continue
    if (looksLikeExtensionFactory(value)) {
      unclassified.push(name)
    }
  }
  return unclassified.sort()
}

export { ENABLED, EXCLUDED }
