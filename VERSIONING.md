# Versioning policy

## Semantic Versioning

All Carve repositories use [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

**Pre-1.0 note:** while the version is below `1.0.0`, minor releases may
introduce breaking changes to grammar, output, or the extension API. Patch
releases fix bugs without changing behavior.

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
vite-plugin-carve.

## Version map

A table of which engine and satellite versions correspond to each grammar
snapshot is maintained on the wiki:

<https://github.com/markup-carve/carve/wiki/Version-Map>

(The wiki Home page hosts this table.)

## Release tracking

Active release coordination happens in issue
[carve#65](https://github.com/markup-carve/carve/issues/65).
