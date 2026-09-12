# Top three feature opportunities across markup-carve

Reviewed: 2026-09-13

## Recommendation

Build these next, in this order:

1. Ship secure file inclusion/transclusion across the engines and CLI.
2. Make import fidelity a release-gated, cross-engine capability.
3. Make the WYSIWYG editor visually edit Carve's rich document structures.

These three fill real user-facing gaps without duplicating capabilities already
present elsewhere in the organization. Together they cover long-document
authoring, trustworthy migration, and approachable visual editing.

## Priority zero: restore AST conformance

Before starting another feature train, fix
[`carve#1980`](https://github.com/markup-carve/carve/issues/1980). The scheduled
AST-conformance job is currently failing on `main`, even though ordinary push CI
is green. Cross-engine parity is an acceptance condition for the recommendations
below, so a red parity signal must be restored first. This is a correctness
blocker, not one of the three new features. The first identified carve-rs cause
has already been fixed; the latest run still reports residual list/list-item
extent, PART 11, and render disagreements.

## How the repositories were checked

The review covered all 57 public repositories currently listed under
[`markup-carve`](https://github.com/orgs/markup-carve/repositories). For each
repository, I checked its purpose, current README feature surface and stated
limitations, open issues, release/maintenance state, and overlap with adjacent
Carve projects. The organization-wide open-issue search returned ten issues;
README contracts were also considered because most repositories currently have
no open issues.

The ranking favors:

- direct benefit to people writing or publishing Carve;
- leverage across multiple repositories and runtimes;
- an existing design or implementation foundation;
- security and fidelity improvements;
- work that is not already implemented under another repository name.

## 1. Secure file inclusion and transclusion

### Feature

Finalize the draft `{{ … }}` include contract, then finish and reconcile its
three draft engine implementations and expose it through the CLIs and host
integrations:

```carve
{{ chapter-2.crv }}
{{ api.crv #authentication }}
{{ appendix.crv @lines:20-80 @shift:1 }}
```

The implementation should include recursive expansion, cycle detection,
containment and symlink checks, depth/byte budgets, heading shifts, deterministic
collision handling, source-position remapping, visible fallback on failure, and
a shared processor-level conformance suite.

### Why this is first

This is the most important missing authoring capability for books, manuals, and
large documentation sets. It lets writers split a document into manageable
chapters without adopting a full static-site generator merely for composition.

The design is detailed but not yet normative on `main`:
[`carve#291`](https://github.com/markup-carve/carve/pull/291) is still a draft
specification PR covering syntax, security rules, failure behavior, limits,
collision policy, and the host resolver boundary.
[`carve#292`](https://github.com/markup-carve/carve/issues/292) tracks the
implementation. Existing partial host support in
[`carve-lsp`](https://github.com/markup-carve/carve-lsp) and
[`carve-press`](https://github.com/markup-carve/carve-press) proves demand, but
current released engines leave directives literal.

This aligns with the inclusion item in the maintainers' own
[`0.2 roadmap`](https://github.com/markup-carve/carve/issues/1092). That roadmap
leaves inclusion's 0.2 scope as a decision, so the first action is to resolve
that scope explicitly instead of treating it as settled. Draft implementations
already exist in
[`carve-js#356`](https://github.com/markup-carve/carve-js/pull/356),
[`carve-php#373`](https://github.com/markup-carve/carve-php/pull/373), and
[`carve-rs#241`](https://github.com/markup-carve/carve-rs/pull/241). The work is
therefore one draft specification plus integration and parity work, rather than
a greenfield design.

### Smallest useful release

1. Resolve the 0.2 scope and land `carve#291`, or an explicitly reduced contract
   extracted from it.
2. Review the three engine drafts against that normative contract and record
   their behavioral differences in one reconciliation matrix.
3. Extract one shared processor conformance suite covering containment, cycles,
   budgets, selections, shifts, collisions, fallback, and source positions.
4. Bring each draft to that suite, then land them in an order that keeps released
   core behavior explicit between engine releases.
5. Add `carve render --resolve-includes --root PATH`, off by default, and verify
   byte-equivalent expanded output across all three engines.

## 2. Release-gated importer fidelity

### Feature

Create a shared importer-fidelity suite and make it a release gate for every
supported input path: HTML, Markdown dialects, Djot, BBCode, Pandoc formats, and
PDF extraction. Each importer should return the same shaped diagnostics for
preserved, normalized, degraded, and dropped content, with replayable fixtures
for every fixed bug.

### Why this is second

Migration is a primary adoption path, and four of the organization's ten open
issues are importer-fidelity defects:

- [`carve-php#1933`](https://github.com/markup-carve/carve-php/issues/1933):
  Markdown raw HTML is escaped instead of imported.
- [`carve-php#1934`](https://github.com/markup-carve/carve-php/issues/1934):
  character references become literal text.
- [`pandoc-carve#168`](https://github.com/markup-carve/pandoc-carve/issues/168):
  a percent-leading comment changes block form on round trip.
- [`pandoc-carve#155`](https://github.com/markup-carve/pandoc-carve/issues/155):
  a pinned-engine marker-fold defect mis-converts six of nine affected
  documents.

These are visible meaning changes, not missing convenience switches. A common
fidelity vocabulary and fixture exchange would let fixes in one importer become
regression cases for the others, while keeping format-specific behavior
explicit.

### Smallest useful release

1. Fix the four filed defects and retain each input as a minimal regression
   fixture.
2. Define one versioned fidelity-report schema shared by direct importers,
   Pandoc, PDF conversion, CLI output, and MCP migration results.
3. Generate a construct-by-format coverage matrix from executable fixtures.
4. Add a scheduled latest-engine run and a release gate that rejects new
   unclassified losses or unexpected semantic AST differences.

## 3. Rich, full-fidelity visual authoring

### Feature

Expand the Tiptap kit in
[`carve-grammars`](https://github.com/markup-carve/carve-grammars), then use
[`carve-wysiwyg`](https://github.com/markup-carve/carve-wysiwyg) as its proving
ground, into visual editing for Carve's distinctive structures:

- tables with headers, alignment, spans, captions, and row groups;
- footnotes and cross-references with searchable targets;
- figures, figure groups, captions, and accessible image metadata;
- admonitions, details, spoilers, tabs, and code groups;
- citations and bibliography entries;
- attributes, IDs, language spans, and document metadata;
- visible source-preserving placeholders for constructs that remain unsupported.

Each structure should have contextual insert/edit controls, validation messages,
keyboard access, undo-safe operations, and an explicit source-diff or fallback
view whenever a visual action normalizes authored spelling.

### Why this is third

The Tiptap package already has the hard architectural pieces: an AST-based
Carve loader, a serializer, and source-preserving nodes. The hosted WYSIWYG is a
small demonstration shell with live source and HTML panes. It round-trips
several advanced constructs, but its visible toolbar is still centered on
headings, emphasis, simple lists, quotes, code, and links. Many structures can
survive a round trip without yet being comfortable to create or edit visually.

Finishing this layer creates the clearest adoption path for writers who should
not need to memorize table markers, container fences, or reference syntax. It
also gives CMS and framework integrations a reusable editor rather than another
renderer-only surface.

### Smallest useful release

1. Add table, footnote/reference, figure, and admonition Tiptap node views and
   dialogs in `carve-grammars`.
2. Surface `carve_lint` findings at the affected visual node and source range.
3. Add citations, tabs/code groups, metadata, and attribute inspectors.
4. If downstream demand is demonstrated, publish a separate reusable editor
   component package for CMS, React, and Vue consumers; keep `carve-wysiwyg` as
   the hosted sandbox rather than turning its demo shell into the library.

## Roadmap alignment

- **Priority zero** is the active conformance failure in `carve#1980` and must
  precede roadmap feature work.
- **Transclusion** is already the major feature candidate in the `carve#1092`
  0.2 roadmap. This report recommends resolving its scope question, landing the
  draft spec, and reconciling the three engine drafts, not starting another
  design or implementation.
- **Importer fidelity** supports the roadmap's source-break migration story:
  0.2 changes are only adoptable if conversion reports and preserves meaning.
- **Rich visual authoring** is additive and can progress in `carve-grammars`
  without changing the 0.2 grammar.

## Strong candidates that did not make the top three

- **WASM parity:** most of the open tracking issue
  [`carve-wasm#72`](https://github.com/markup-carve/carve-wasm/issues/72) shipped
  in 0.1.2, including profiles, static mode, positions, labels, typography,
  heading-ID options, linting, AST ingest, Djot/BBCode conversion, and
  provenance. Update or close the stale tracker, classify the few residual
  gaps, and generate a parity inventory; do not treat this as a top-three new
  feature.
- **More LSP features:** not currently a gap. The
  [Carve LSP](https://github.com/markup-carve/carve-lsp) already provides
  diagnostics, completion, hover, navigation, references, workspace rename,
  code actions, lenses, folding, formatting, semantic tokens, inlay hints,
  includes, and workspace graphs. Several editor READMEs understate it.
  Updating the Emacs, Helix, Vim, and Zed READMEs to advertise the shared LSP's
  full capabilities is a cheap adoption win.
- **More output formats:** already well covered by native HTML/Markdown/text/ANSI
  renderers, three PDF routes, chat renderers, and
  [`pandoc-carve`](https://github.com/markup-carve/pandoc-carve) for DOCX,
  LaTeX, Typst, and other Pandoc targets.
- **Another static-site integration:** Astro, Eleventy, Hugo, Jekyll, MkDocs,
  Zensical, Docusaurus, Vite, Webpack, and CarvePress already cover the major
  paths. Extending Docusaurus to versioned snapshots/blogs and Astro to direct
  page components is worthwhile, but narrower than the selected work.
- **Another syntax highlighter:** Tree-sitter, TextMate, Prism, highlight.js,
  Pygments, Rouge, and editor-native packages already provide broad coverage.
- **More language bindings:** JavaScript, PHP, Rust, Go, Python, Ruby, WASM, and
  WASI routes exist. Improving parity and generated drift inventories is more
  valuable than adding another thin binding now.

## Repository inventory reviewed

- **Core, engines, bindings, and contracts:** `.github`, `carve`, `carve-js`,
  `carve-php`, `carve-rs`, `carve-go`, `carve-py`, `carve-rb`, `carve-wasm`,
  `carve-bench`, `pandoc-format-fidelity`.
- **Authoring, agents, editors, and grammars:** `carve-grammars`, `carve-lsp`,
  `carve-mcp`, `carve-skill`, `carve-wysiwyg`, `emacs-carve`, `helix-carve`,
  `intellij-carve`, `obsidian-carve`, `sublime-carve`, `sublime-carve-lsp`,
  `vim-carve`, `vscode-carve`, `zed-carve`, `tree-sitter-carve`,
  `highlightjs-carve`, `pygments-carve`, `rouge-carve`.
- **Publishing, conversion, and presentation:** `carve-css`, `carve-components`,
  `carve-hexapdf`, `carve-pdf`, `carve-php-chat`, `carve-php-media-embed`,
  `carve-sile`, `pandoc-carve`, `pdf-to-carve`.
- **Frameworks, CMSs, and site generators:** `astro-carve`, `carve-press`,
  `docusaurus-carve`, `eleventy-carve`, `hugo-carve`, `jekyll-carve`,
  `laravel-carve`, `laravel-carve-demo`, `mkdocs-carve`, `shopware-carve`,
  `symfony-carve`, `symfony-carve-demo`, `vite-plugin-carve`,
  `webpack-loader-carve`, `wp-carve`, `zensical-carve`,
  `zensical-carve-demo`.
- **Distribution and discovery:** `awesome-carve`, `homebrew-carve`.

That inventory accounts for all 57 public organization repositories at review
time.
