---
description: A reading and test path for a Carve 0.2 implementation.
---

# Implementing Carve 0.2

Carve is designed to be re-implementable. The role of a block line depends only on that line, the open blocks and five facts about the lines directly above it, so a block parser reads the source in one forward pass and never waits for a later line except for a pending attribute line. Document-wide references resolve in a later pass, so a use can precede its definition. A shared conformance corpus gives reviewed inputs and expected output for every engine. This page is the starting point for writing a new parser, an editor integration or a framework plugin, and for getting it adopted into the [markup-carve](https://github.com/markup-carve) organization.

The 0.2 specification is a freeze candidate, not a released standard; its status page names what is frozen, what is provisional and what is open. The extension interface is provisional and not frozen with the core. Do not use the 0.1 aggregate EBNF or its `scripts/spec` model as a 0.2 oracle: both describe 0.1 syntax.

## The spec surface

Everything normative lives in the `spec/0.2/` directory of the [carve](https://github.com/markup-carve/carve) repository, as ten documents with clause ids such as `C2-B-001`. The [specification index](./grammar) lists them. Read them in this order:

1. **Block syntax** and **inline syntax** to build the parser. Start block parsing with the [container ownership](./ownership-procedure) page, which reads the ownership clauses as one procedure.
2. **AST 2.0** and its JSON schema. Keep author spelling out of the tree, in the separate **source-layout sidecar** ([source layout](./ast-source-layout)).
3. **HTML** for resolution and rendering, then **writer** for canonical source, formatting and diagnostics.
4. **Includes**, **HTML import** and the **tooling** contract. Read **extensions** when implementing its provisional interface ([extension contract](./extension-contract)).

Non-normative pages that help along the way:

- The [case study](./case-study/) records the design rationale behind the rules, including [Parsing and AST](./case-study/parsing-ast) and [Implementation and reflection](./case-study/implementation). It is historical and describes the 0.1 line.
- [Syntax edge cases](./parsing-ambiguities) and [Divergence from Djot](./divergence-from-djot) cover the corners where Carve makes a specific, tested choice.
- [Decision trace](./decision-trace) explains how to find the first line where two engines decide differently. 0.2 specifies no trace format, so report mismatches by conformance case id and clause.
- [Source-preserving patches](./source-patches) explains why 0.2 specifies no patch API and what an editor integration uses instead.

## Conformance tiers

The bar to call something **a Carve implementation** is the core: it parses and renders the native syntax correctly against the shared corpus.

- **Core (required).** Native blocks and inlines: headings, paragraphs, lists, quotes, fenced code, tables, frontmatter, captions, divs and admonitions, the inline delimiters (`/emphasis/`, `*strong*`, braced `{_underline_}`, `{~strike~}`, `{=highlight=}`, `{^sup^}`, `{,sub,}`, `{+insert+}`, `{-delete-}`), links, images and attributes. The tooling chapter defines the library calls and the command line every engine offers.
- **Extensions and adapters (optional).** The extension registry, `:name[content]` and named-div handlers, and host-specific adapters. The extension interface is provisional, so an implementation may omit it and still claim the core.

A partial tool (highlighting only, an editor grammar, a one-way converter) is still welcome in the ecosystem. It is listed on the [Ecosystem](./ecosystem) page with an accurate status tag rather than claimed as a full implementation.

## Test against the shared cases

Pin a specific `main` commit and record that pin in your engine. The corpus in `spec/0.2/conformance/` is three JSON files with one schema:

- `examples.json` holds every example of the ten documents, generated from them.
- `clause-cases.json` holds hand-curated inputs a clause decides that no example covers.
- `refused-trees.json` holds trees a 2.0 reader refuses.

A fourth file, `extensions.json`, holds the standard extension corpus. Each entry names an operation (`render`, `write`, `lint`, `include`, `import`, and for clause cases also `parse`, `format`, `layout`, `tree`, `cli` and more), its input and options, and the expected fields. Run each entry's operation with its options, compare the expected fields, and use the case id in failure reports. HTML and Carve source are compared byte for byte. The tree fixtures exercise valid, imported and refused ASTs plus layout sidecars.

Run `npm run spec2:data` in the spec checkout to verify the corpus before interpreting a mismatch. Examples marked unverified have output written by hand from the clauses: check the clause before treating a mismatch as an engine defect. The [comparison methodology](./implementation-comparison-methodology) explains how a reproducible comparison is run and the limits of a pass rate.

A port may use its language's naming conventions for calls and errors. The reference TypeScript engine is [`carve-js` on `main`](https://github.com/markup-carve/carve-js/tree/main); its CLI is named `carve`.

In 0.1 the corpus was a directory of `.crv` and `.html` pairs, and the carve repository ran sibling engine checkouts against it with `scripts/compare-impls.mjs`. Both stay on the `0.1` branch; they do not test 0.2.

## Renderer architecture

The 0.1 line kept an executable spec model in this repository as an oracle. Its sentinel-based string passes were allowed because they ran against the trusted corpus and made byte comparisons easy. That trust bounded the security argument; it did not make the oracle maintenance-free, and it drifted from the engines when a rule was copied into another local string pass. 0.2 has no such model: the clauses and the conformance corpus are the oracle.

Production engines should resolve document-level semantics on the tree before serializing HTML:

1. Parse block and inline structure.
2. Collect definitions and generated ids.
3. Resolve references, footnotes, cross-references, caption numbers and abbreviation applications into tree state.
4. Render the resolved tree to the requested target.

Avoid rendering temporary HTML and then rewriting it with string replacements. For example, a paragraph that resolves to a single image with a caption should be represented internally as block-level image or figure state before serialization. The resolved state can then render directly as `<figure>` and `<figcaption>` in HTML, or as the target's own block-image form elsewhere.

The same resolved tree should feed HTML, Markdown, plain text, ANSI and static HTML renderers. Target-specific renderers may choose different output shapes, but they should not reimplement reference and caption resolution separately. In 0.2 only the HTML output is specified; Markdown, plain text and ANSI exports are engine behavior.

## Getting your project into the org

The org is curated, and the entry point is an issue, not a surprise transfer request.

1. **Open an issue** on the [carve](https://github.com/markup-carve/carve) repo describing what you are building: language or host, scope, and whether you target the core alone or the extensions too. Start the conversation early; feedback before you are "done" is cheaper.
2. **Build it** in your own namespace and get the core passing against the corpus (or, for editor and integration tooling, get it usefully working).
3. **Request adoption** in that issue once it stands on its own. A maintainer transfers or creates the repo under [markup-carve](https://github.com/markup-carve) and adds it to the [Ecosystem](./ecosystem) page.

Not every tool needs to join the org. External projects are welcome in [awesome-carve](https://github.com/markup-carve/awesome-carve); the org is for the maintained core and first-party tooling.

**Specification (external):** [Status and document map](https://github.com/markup-carve/carve/blob/main/spec/0.2/README.md), [STATUS](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md), [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (C2-B-001), [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (C2-I-075), [AST 2.0](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md), [AST schema](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/ast-schema.json), [Source layout](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md), [HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md), [Writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md), [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md), [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#library) (C2-T-003, C2-T-005), [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md), [Conformance corpus](https://github.com/markup-carve/carve/blob/main/spec/0.2/conformance/README.md), [Tree fixtures](https://github.com/markup-carve/carve/blob/main/spec/0.2/trees/README.md).
