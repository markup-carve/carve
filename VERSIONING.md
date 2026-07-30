# Versioning policy

## Semantic Versioning

All Carve repositories use [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

**Pre-1.0 note:** while the version is below `1.0.0`, minor releases may
introduce breaking changes to grammar, output, or the extension API. Patch
releases fix bugs without changing behavior.

## Stored documents

This file is about **repository and release** versioning. The companion question -
what a spec change means for `.crv` files that already exist - is answered by the
[versioning and changelog page](docs/versioning.md), which is the source of truth
for "did the language change in a way that affects my documents?".

The short version: every changelog entry is tagged `[behavior]`,
`[clarification]` or `[addition]`, and only `[behavior]` entries can require
document migration. A document records the spec version it was last processed
under via `carve fmt --stamp`, so upgrading means reviewing the `[behavior]`
entries between that stamp and the target version.

Tooling can read the marker back. `carve --stamp-check` exits non-zero for a
document that predates the engine's spec version, so it works as a CI gate over a
directory of stored documents. All three engines implement it - `Stamp::read()` /
`Stamp::needsReview()` in carve-php, `readStamp()` / `needsReview()` in carve-js,
`read_stamp()` / `needs_review()` in carve-rs - behind the same two flags with the
same output, so any of them can check what another wrote.

Reading is not universal yet: the Go, Ruby and Python bindings drive carve-rs but
none of them surfaces the reader. The [versioning page](docs/versioning.md)
carries the per-implementation table.

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

The authoritative list of satellites is [the ecosystem page](docs/ecosystem.md),
which is grouped by role (parsers, bindings, editor support, framework
integrations, AI tooling). It is deliberately not duplicated here: the copy that
used to live in this file drifted and ended up naming repositories that do not
exist.

## Version map

A table of which engine and satellite versions correspond to each grammar
snapshot is maintained on the wiki:

<https://github.com/markup-carve/carve/wiki/Version-Map>

(The wiki Home page hosts this table.)

## Release tracking

Active release coordination happens in issue
[carve#65](https://github.com/markup-carve/carve/issues/65).
