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
- **[Case Study](./case-study/)** - the design rationale behind the rules
  (historical, not normative), including [Parsing & AST](./case-study/parsing-ast)
  and [Implementation & Reflection](./case-study/implementation).
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
  `=highlight=`, braced `{^sup^}` / `{,sub,}`), links, images, attributes.
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

## Renderer architecture

The executable spec in this repository is an oracle, not a recommended engine
architecture. Its sentinel-based passes are allowed because they run against the
trusted corpus and make byte comparisons easy. That trust bounds the security
argument; it does not make the oracle maintenance-free. The oracle can still
drift from the engines when a rule is copied into another local string pass.

Production engines should resolve document-level semantics on the tree before
serializing HTML:

1. Parse block and inline structure.
2. Collect definitions and generated ids.
3. Resolve references, footnotes, cross-references, caption numbers, and
   abbreviation applications into tree state.
4. Render the resolved tree to the requested target.

Avoid rendering temporary HTML and then rewriting it with string replacements.
That style is acceptable in the oracle, but production renderers should prefer
semantic nodes and target-specific serializers.

For example, a paragraph that resolves to a single image with a caption should
be represented internally as block-level image or figure state before
serialization. The resolved state can then render directly as `<figure>` /
`<figcaption>` on HTML, or as the target's own block-image form elsewhere.

The same resolved tree should feed HTML, Markdown, plain text, ANSI, and static
HTML renderers. Target-specific renderers may choose different output shapes,
but they should not reimplement reference and caption resolution separately.

Keeping the oracle's current shape is a deliberate maintenance cost, not an
exemption from the same class of drift production engines avoid by resolving
tree state first.

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
