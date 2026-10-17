# Versioning policy

## Version numbers

Carve uses `MAJOR.MINOR.PATCH` version numbers. During the `0.1.x` series,
Carve treats the third component as a minor feature increment. A coordinated
`0.1.x` release may add core grammar or change output after the spec and all
three engines pass the same corpus. Breaking changes still require a review of
stored documents and a `[behavior]` entry in the release notes.

A fix confined to one repository may also use an independent `0.1.x` release.
The shared feature release must choose a number above every existing core
repository version so its tag identifies the same grammar snapshot everywhere.

## Stored documents

This file is about repository and release versioning. The companion question -
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

Every implementation reads it, including the Go, Ruby and Python bindings over
carve-rs. The [versioning page](docs/versioning.md) carries the
per-implementation table of what each one calls it.

## Stability scope (0.1)

What the 0.1 release guarantees, by tier (the line is drawn at the
Tier-2 / Tier-3 seam):

- **Tier-1 core** (emphasis, headings, links, lists, tables, code, blockquotes,
  footnotes, math, admonitions, attributes, frontmatter, comments, autolinks,
  raw blocks, heading ids, cross-references) and the always-on security model
  (grammar PART 9 §25/§26) are **normative and stable** - corpus-pinned with
  byte-parity across all three engines. Changes require a coordinated `0.1.x` feature release.
- **Tier-2 standard extensions** (citations incl. typed-locator + integral
  enrichment, code callouts, mentions/tags, and the four block features pinned
  in `tests/corpus-optional` - list tables, details, spoilers, tabs) are
  **stable and corpus-pinned** in 0.1.
  Their syntax and HTML contract will not change without a coordinated feature release.
- **Tier-3 app-level extensions** (bibliography, glossary, index, heading
  numbers, Mermaid, table-of-contents, heading permalinks, ColorSwatch, QR,
  static maps, and other host-dependent extensions)
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

The four core repositories advance together on every coordinated feature release:

| Repository | Role |
|------------|------|
| `markup-carve/carve` | Normative grammar (`resources/grammar.ebnf`) + conformance corpus |
| `markup-carve/carve-js` | JavaScript / TypeScript engine |
| `markup-carve/carve-rs` | Rust engine |
| `markup-carve/carve-php` | PHP engine |

A coordinated feature release tags the same version in all four repositories
at the same grammar and corpus snapshot. During `0.1.x`, that number advances
the third component.

Independent fix releases remain per-repository. A fix in one engine does not
force the others to re-release, so their `0.1.x` numbers may differ between
coordinated feature releases.

## Satellites

Satellite repositories (editor integrations, language bindings, tooling) track
the core but version on their own cadence. They are not required to match core
version numbers at any level. Each satellite should document which core version
it targets in its own README.

The authoritative list of satellites is [the ecosystem page](docs/ecosystem.md),
grouped by role (parsers, bindings, editor support, framework integrations, AI
tooling). Do not duplicate it here: a second copy drifts and ends up naming
repositories that do not exist.

## Version map

The wiki Home page carries a table of which engine and satellite versions
correspond to each grammar snapshot:

<https://github.com/markup-carve/carve/wiki/Version-Map>

## Release tracking

The maintained release process lives in [`MAINTAINING.md`](MAINTAINING.md):
the lockstep between the spec and the engines, what a pin bump has to sweep,
the order for a cross-cutting behavior change, and the coordination rules that
keep parallel automation from stacking duplicate or reverting PRs.
