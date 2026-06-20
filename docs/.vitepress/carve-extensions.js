// The full Tier-3 extension set, so the docs render Carve with every feature
// turned on (mermaid diagrams, wikilinks, tabs/code-groups, TOC, heading
// permalinks, citations, …). Shared by the runtime Playground render and the
// build-time vite-plugin-carve render so both surfaces match.
//
// Imported from the vendored carve-lib (kept in sync via `npm run
// sync-carve-lib`) so the extension objects come from the same Carve build the
// Playground renders with.
import {
  details,
  mermaid,
  wikilinks,
  autolink,
  externalLinks,
  tableOfContents,
  headingPermalinks,
  codeGroup,
  tabs,
  headingLevelShift,
  headingReference,
  defaultAttributes,
  citations,
} from './carve-lib/index.js'

/** Construct a fresh array of every documented extension (defaults only). */
export function carveExtensions() {
  return [
    details(),
    mermaid(),
    wikilinks(),
    autolink(),
    externalLinks(),
    tableOfContents(),
    headingPermalinks(),
    codeGroup(),
    tabs(),
    headingLevelShift(),
    headingReference(),
    defaultAttributes(),
    citations(),
  ]
}
