// The extensions worth turning on for the docs demos: the authoring features a
// user actually writes (Mermaid diagrams, wikilinks, bare-URL autolinks,
// collapsible details, code-groups and tabs). Shared by the runtime Playground
// render and the build-time vite-plugin-carve render so both surfaces match.
//
// Deliberately NOT enabled: table-of-contents and heading-permalinks (they
// auto-inject a TOC / mutate every heading with anchors, which clutters a
// preview and clashes with VitePress's own heading handling), plus
// external-links / heading-reference / default-attributes / citations /
// heading-level-shift (no visible effect without config, or surprising
// link rewriting).
//
// Imported from the vendored carve-lib (kept in sync via `npm run
// sync-carve-lib`) so the extension objects come from the same Carve build the
// Playground renders with.
import {
  details,
  mermaid,
  wikilinks,
  autolink,
  codeGroup,
  tabs,
} from './carve-lib/index.js'

/** Construct a fresh array of the demo-useful extensions (defaults only). */
export function carveExtensions() {
  return [details(), mermaid(), wikilinks(), autolink(), codeGroup(), tabs()]
}
