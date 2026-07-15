# Versioning policy

## Semantic Versioning

All Carve repositories use [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

**Pre-1.0 note:** while the version is below `1.0.0`, minor releases may
introduce breaking changes to grammar, output, or the extension API. Patch
releases fix bugs without changing behavior.

## Stability scope (0.1)

What the 0.1 release guarantees, by tier (the line is drawn at the
Tier-2 / Tier-3 seam):

- **Tier-1 core** (emphasis, headings, links, lists, tables, code, blockquotes,
  footnotes, math, admonitions, attributes, frontmatter, comments, autolinks,
  raw blocks, heading ids, cross-references) and the always-on security model
  (grammar PART 9 §25/§26) are **normative and stable** - corpus-pinned with
  byte-parity across all three engines. Changes require a coordinated minor.
- **Tier-2 standard extensions** (citations incl. typed-locator + integral
  enrichment, bibliography, code callouts, glossary, index, heading numbers,
  mentions/tags) are **stable and corpus-pinned** in 0.1. Their syntax and HTML
  contract will not change without a minor bump.
- **Tier-3 app-level extensions** (Mermaid, Tabs, table-of-contents, heading
  permalinks, ColorSwatch, QR, static maps, and other host-dependent showcases)
  ship and are documented, but are **not covered by the 0.1 stability
  guarantee** - they may evolve in any release. Several depend on a host library
  or service and so cannot be normatively corpus-pinned like core.
- **Tooling** - the round-trip / reverse converters (Markdown / HTML / Djot /
  BBCode to Carve, plus the `carve fmt` formatter) and the language server
  (`carve-lsp`) - ships as part of the ecosystem but **versions independently**
  of the spec tag (see Satellites below); it is not part of the lockstep core.

In short: build on Tier-1 + Tier-2 with confidence; treat Tier-3 and the
converters / LSP as available-but-evolving.

## Core lockstep

The four core repositories advance together on every **minor** and **major** release:

| Repository | Role |
|------------|------|
| `markup-carve/carve` | Normative grammar (`resources/grammar.ebnf`) + conformance corpus |
| `markup-carve/carve-js` | JavaScript / TypeScript engine |
| `markup-carve/carve-rs` | Rust engine |
| `markup-carve/carve-php` | PHP engine |

A shared lockstep minor/major version means: all four repos tag the same version
number at the same grammar and corpus snapshot. When the grammar or corpus changes
in a way that requires coordinated implementation updates, all four repos cut a
new minor together.

**Patches are per-repo.** A bug fix that touches only one engine does not force
the others to re-release. The version number of each repo may diverge at the
patch level between lockstep minors (e.g. `carve-js@0.1.3` and `carve-rs@0.1.1`
can coexist while both implement the `0.1` grammar).

## Satellites

Satellite repositories (editor integrations, language bindings, tooling) track
the core but version on their own cadence. They are not required to match core
version numbers at any level. Each satellite should document which core version
it targets in its own README.

Current satellites: carve-emacs, carve.vim, carve-sublime, carve-wysiwyg,
carve-components, python-carve, intellij-carve, vscode-carve, lsp-carve,
vite-plugin-carve, carve-skill.

## Version map

A table of which engine and satellite versions correspond to each grammar
snapshot is maintained on the wiki:

<https://github.com/markup-carve/carve/wiki/Version-Map>

(The wiki Home page hosts this table.)

## Release tracking

Active release coordination happens in issue
[carve#65](https://github.com/markup-carve/carve/issues/65).
