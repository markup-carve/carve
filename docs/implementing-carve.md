# Build Your Own Implementation

Carve is designed to be re-implementable. The parsing is linear-time with no
backtracking and no forward references, the rules are unambiguous, and there is
a shared conformance corpus you can test against. This page is the starting
point for writing a new parser, an editor integration, or a framework plugin -
and for getting it adopted into the [markup-carve](https://github.com/markup-carve)
organization.

## The spec surface

Everything normative lives in the [carve](https://github.com/markup-carve/carve)
repository. In rough order of usefulness when implementing:

- **[Spec corpus](https://github.com/markup-carve/carve)** - the `.crv` / `.html`
  example pairs in the repo. This is the executable contract: your output for a
  given input must match. It is the same corpus every reference parser runs
  against.
- **[Formal Grammar](./grammar)** - the block and inline grammar.
- **[Case Study](./case-study/)** - design rationale and the syntax
  specification, including [Parsing & AST](./case-study/parsing-ast) and
  [Implementation & Reflection](./case-study/implementation).
- **[Extensions Contract](./extensions)** - the normative contract for the
  `:type[content]{attrs}` extension syntax (optional - see tiers below).
- **[Edge Cases](./edge-cases)** and **[Divergence from Djot](./divergence-from-djot)**
  - the corners where Carve makes a specific, tested choice.

## Conformance tiers

The bar to call something **a Carve implementation** is **Tier-1 core**: it
parses and renders the native syntax correctly against the spec corpus.

- **Tier-1 (core, required)** - native blocks and inlines: headings, paragraphs,
  lists, blockquotes, fenced code, tables, frontmatter, captions, admonitions,
  and the inline mnemonics (`/italic/`, `*bold*`, `_underline_`, `~strike~`,
  `^sup^`, `,,sub,,`, `==highlight==`), links, images, attributes.
- **Tier-2 (extensions and adapters, optional)** - the extension registry,
  `:type[content]{attrs}` handlers, and host-specific adapters. Implementations
  may omit these and still be conformant.

A partial tool (highlighting-only, an editor grammar, a one-way converter) is
still welcome in the ecosystem - it is listed on the [Ecosystem](./ecosystem)
page with an honest status tag rather than claimed as a full implementation.

## Testing against the corpus

The corpus lives in the carve repo, which also owns the cross-implementation
comparison runner (`scripts/compare-impls.mjs`). It runs sibling implementation
checkouts against the same `.crv` / `.html` pairs and reports default
conformance, optional Tier-2 adapter coverage, rough CLI timing, and the
extension hook surface each implementation exposes. See
[Implementation Comparison](./implementation-comparison) for the current
snapshot and how the runner is wired.

A new parser only needs to:

1. Read each `.crv` input from the corpus.
2. Produce HTML.
3. Compare against the paired `.html`, normalizing trailing whitespace.

## Getting your project into the org

The org is curated, and the entry point is an issue - not a surprise transfer
request.

1. **Open an issue** on the [carve](https://github.com/markup-carve/carve) repo
   describing what you are building (language/host, scope, which tier you target).
   Start the conversation early; feedback before you are "done" is cheaper.
2. **Build it** in your own namespace and get Tier-1 core passing against the
   corpus (or, for editor/integration tooling, get it usefully working).
3. **Request adoption** in that issue once it stands on its own. A maintainer
   transfers or creates the repo under
   [markup-carve](https://github.com/markup-carve) and adds it to the
   [Ecosystem](./ecosystem) page.

Not every tool needs to join the org. External projects are welcome in
[awesome-carve](https://github.com/markup-carve/awesome-carve); the org is for
the maintained core and first-party tooling.
