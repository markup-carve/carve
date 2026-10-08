# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases before 0.1.6 are archived in
[CHANGELOG-0.1.md](./CHANGELOG-0.1.md).

## [Unreleased]

### Fixed

- Playground quotes preserve paragraph spacing and align attribution with the quote body.

### Breaking

- Image alt text now resolves backslash escapes before ASCII punctuation.
  Markup stays literal. A table image can spell a pipe as `\|`; a literal
  backslash before punctuation must be doubled.

- The include rename warning carries the rule id `include-id-rename`, renamed
  from `include-heading-id-rename`. The rename pass stopped being about headings
  in 0.1.8 and its message followed; the id did not. Tools matching on the old
  id have to follow (#2772).

### Fixed

- An include option needs no whitespace before its `@`, in either position:
  `{{ path@shift:1 }}` and `{{ path #Name@shift:1 }}` are well formed. The
  grammar required a whitespace run while the path and the section name were
  both specified to stop at `@`, which left that split unparseable (#2773).
- An unquoted include option value ends at the next `@`, so
  `{{ path @shift:1@lines:1-8 }}` is two options. A quoted include path decodes
  `\"` and `\\` only and keeps every other backslash pair as path text (#2778).

## [0.1.8] - 2026-10-06

### Compatibility and migration

With the new engine, lint existing documents before deploying their output.
`fmt --migrate` repairs unambiguous case-only reference misses. Review changes
to collapsed link text and image alt text; include selectors, glossary
references and external fragment links need manual review. See the
[migration guide](https://github.com/markup-carve/carve/blob/main/docs/validation.md#automatic-repair).

### Breaking

- Heading cross-references, numbered caption and equation references,
  and collapsed references that fall back to heading text now compare case
  exactly. Link-definition labels and footnote labels already did; the include
  selector rule now agrees with the exact lookup the engines already shipped.
  A case-only mismatch is unresolved; `{#Tip}` and `{#tip}` identify separate
  targets. Default heading slug derivation, whitespace normalization and NFC are unchanged (#2732).
- An include renames a colliding explicit id on any element, not only a heading
  id or a footnote label. Explicit ids share one namespace, the first
  occurrence in expanded order keeps the name, each later copy from another
  inclusion takes its own least free `-N` and emits a warning, and a reference
  written in the same inclusion follows the rename (#2729, #2732).
- A glossary reference compares its bracket text with each term's text exactly,
  under the same rule as every other name lookup: trimmed, whitespace
  collapsed, NFC, no case folding. A glossary id keeps its case, so two terms
  differing only in case take two ids. The index keeps its own lowercased slug,
  which the contract now calls grouping rather than a name lookup, and an
  admonition type stays a keyword (#2739).
- A render that blanks a denied URL destination now owes one row on the
  render-loss report, in both safe modes: one per blanked link destination,
  autolink destination or image source, in document order, under the code
  `destination-denied` and with no `format`. The report's `code` enum holds
  three codes rather than two (#2679).
- That row's message is named rather than left to the engine. A link or
  autolink takes `Blanked a denied destination scheme` and an image source
  takes `Blanked a denied image source`, emitted verbatim with nothing
  appended. Where no clause names a message it stays the engine's own wording
  and is not compared (#2686).

### Fixes

- The release reference-pin check accepts a spec-submodule-only update when the JavaScript build is unchanged. Other pin differences still fail the check (#2762).

- The upgrade guide distinguishes newly exact lookups from labels that already
  matched case exactly, and explains migration limits. Tests keep case-distinct
  numbered captions and equations separate (#2759).

- The `broken-fragment-link` rule reads the caller's own render, carrying the
  extensions passed to the linter, so a link absent from that render is not
  checked. A link inside an unreferenced footnote definition is left to
  `unused-footnote-definition`, held by corpus row 545 (#2730, #2731).
- A reference image with no matching definition is reported under
  `unresolved-reference-link`, the rule that already covered reference links.
  `![alt][label]` and `![alt][]` take the same case-only hint under no new rule
  id, and the link trigger stays the only default trigger (#2740).
- An info string decides nothing for a flush-left fence line below a closed
  nested fence in a description body. With no closer ahead the line is the
  body's content whether or not it carries a language, and a terminated fence
  at that column ends the body for a bare run and a tagged one alike. Corpus
  row 547 pins all three readings (#2741).
- A description body whose own block is a fence takes no line below the
  body's column: the fence opened on the body line holds nothing, and the
  flush-left lines beneath it are a paragraph outside the list rather than
  that fence's content. Corpus row 548 pins the reading (#2747, #2752).
- A fenced blockquote is reachable from the document grammar. `quote_block` sat
  in no rule's right-hand side, so a parser generated from the grammar alone
  could not build one. Every remaining production is now either reachable or
  declared unreachable with its reason, checked in both directions, and a URL
  autolink reuses the URL production instead of respelling it (#2670).
- A forced span or an editorial insertion, deletion or substitution opened
  inside a bracket run cannot match a closer past that run's closing `]`, so
  `[{+a]+}` is text; a container label keeps a construct that closes before a
  trailing comment cut (#2618, #2645).
- A list-indentation lint finding reports once per block rather than once per
  block-shaped line, and a quoted attribute value and a link title share one
  punctuation escape set, keeping a backslash that precedes anything else
  (#2587, #2643).
- An empty raw block written for the HTML target has one defined slot in a list
  item, replacing a two-against-two split between the engines (#2567).
- An over-indented quote marker stays literal after a fence opened on a list
  item's marker line, and closing a later fence restores the authored
  indentation base (#2627).
- A named `:::` container whose opener metadata is invalid keeps the container
  and its children. A malformed quoted title, a bare unquoted title or a tab
  before the title now builds the named container, drops the opener metadata
  and reports `fence-title-syntax`, where the opener and its closer previously
  reached the page as paragraph text. An unrecognized fence or type prefix is
  still prose (#2693, #2695).

### Improvements

- The canonical writer may take the refuse arm past the nesting cap:
  over-cap flattening owes it no spellable tree, so a typed refusal is a
  legitimate outcome of the cap and not a defect, while emitting source
  that reads back as a different document stays forbidden. `CARVE-P9-078`
  carries the measurement and the overturn condition (#2743, #2753).
- An include fragment names any block carrying that explicit id, not only a
  heading. A matching heading still selects its section first; otherwise the
  first such block in document order, at any depth, is selected alone with its
  own attributes. An id on an inline span, list item, table row or cell selects
  nothing (#2727).
- A pipe table keeps multiple bodies, intermediate header rows, empty body
  boundaries and per-body row-header columns in canonical source, through the
  positional `body-rows`, `body-header-rows` and `body-header-cols` attributes.
  Invalid body metadata leaves every row-group attribute ordinary (#2708).
- Canonical Carve source preserves authored destinations, including the schemes
  the render denylist refuses, because the formatter's round-trip invariant
  comes first. It applies no denylist and owes no `destination-denied` row. The
  HTML, Markdown and ANSI targets still blank those destinations and report the
  loss, and a consumer that renders serialized source or AST data applies the
  denylist at its own URL sinks (#2685).
- An opener under a quote holding an open paragraph folds into that paragraph
  at every column but the host's content column, and the shared
  `paragraph-interruption.json` resource states that boundary rather than
  describing a wider rule than the clause (#2615).
- The documentation site reads comments in headings and captions correctly: a
  code span keeps its percent runs, and a trailing comment keeps its scope and
  its color in both themes, including inside a quoted heading or caption
  (#2682).
- Active grammar and spec comments state the current rule without the engine history that reached it. No production, clause meaning, corpus row or oracle answer moves (#2766).

## [0.1.7] - 2026-09-29

### Breaking

- Markdown bytes change: rich text is respelled, a numeric character reference's
  hash is escaped under `plain`, `markdown` and `djot`, and a loose list keeps
  its tightness (#2171, #2174, #2177, #2180, #2281,
  #2294).
- Markdown output reads correctly in a GFM reader, changing block-cell images,
  row-head counts, a whitespace code line, a narrow header, autolinks, a cell's
  soft break, a list table and a bare email (#2371, #2374, #2381,
  #2391, #2392, #2398, #2402, #2403, #2408,
  #2409, #2413, #2418, #2421, #2443, #2456).
- A footnote definition and reference spell the target as `label` and refuse
  `id`, and a citation item carries its own mode while the group keeps the
  authored shorthand (#2184, #2193, #2203, #2213,
  #2218).
- Every empty block container renders one blank HTML body line, replacing the
  compact forms (#2184).
- A named `:::` container is a callout, a directive or a div; an admonition
  refuses the generated-content kinds, and a kind whose element cannot hold a
  paragraph keeps its title and label outside it (#2195, #2225,
  #2264, #2265, #2269, #2276).
- `::: footnotes`, `::: references` and `::: bibliography` place only at
  document top level and render the plain `<div>` floor anywhere else, while
  `::: toc`, `::: glossary` and `::: index` stay unrestricted (#2274,
  #2286, #2303, #2305).
- An importer writes different Carve for edge whitespace around a link or span,
  a linear `<math>` with no TeX, a formula beside a fallback image, a
  denied-scheme destination, and an empty `<ul>` or `<ol>`, now dropped with an
  `element-dropped` warning (#2254, #2255, #2361, #2365,
  #2367, #2375).
- Import answers also change what an importer writes for adjacent definition
  lists, a figure's attribute line, a multi-line comment in a cell, an empty
  heading, a pipe or line break in an attribute value, a term-less description,
  a heading comment, and a Markdown task label that doubles as a reference
  definition (#2273, #2291, #2369, #2370, #2372,
  #2383, #2384, #2385, #2386, #2396, #2399,
  #2419, #2441, #2455).
- A generated space is its own AST node, so U+E000 is literal content in every
  string field. A tree stored under the old marker emits that character raw into
  HTML; only reparsing the source fixes it (#1242, #2337).
- AST validation tightens: `directive.children` is required, `admonition.kind`
  may not be empty, and the render-loss `code` enum closes at two codes, a
  dropped table section attribute now reporting `field-unspellable` on the
  conversion-diagnostics channel (#2335, #2344, #2346).
- A column is counted in codepoints, which moves every position reported on a
  line holding astral or combining characters (#2400).
- An unquoted attribute value cannot hold characters that would restructure the
  block, a key-value class folds into the class slot, no pad follows an opener a
  line break follows, and a summary flattens into the title (#2434,
  #2442, #2447).
- A definition term has no content column at any depth, and a comment or a
  definition under a term folds at every depth (#2411, #2426,
  #2458).
- `code_block.content` is literal payload text: a nonempty code block keeps its
  final line break, an unclosed fence at the end of the document keeps the
  absence of one, and an empty fence carries no payload newline (#2560,
  #2579, #2603).
- A comment no longer lets a retained list marker below an item's content column
  open a child list; the marker stays paragraph text, and two spaces still open
  a sublist (#2619).

### Fixes

- A `%%` line's text is a content line, separated by exactly one space or tab; a
  `%%%` block keeps its payload bytes and the whitespace beyond its container's
  prefix; a comment inside a forced span or the combined token ends at that
  closer; and a trailing `%%` is recognized after a tab and in any inline text
  (#2167, #2170, #2314, #2535, #2552, #2562,
  #2599).
- A delimiter after `_` or `/` opens only when that one pairs, a name run gives
  up the underline closer it cannot keep, and the combined bold-italic token
  takes any character as content, including an asterisk run (#2129,
  #2130, #2131, #2132, #2133, #2134, #2135,
  #2137, #2156, #2159, #2160, #2162).
- A quote is decided by the glyph before its run and an escaped quote keeps its
  place in that chain; a code span pairs any run length and refuses one past the
  last tier; a form feed or no-break space is content wherever whitespace is
  tested (#2144, #2146, #2157, #2158, #2161,
  #2163, #2164, #2166).
- A reference definition reads both title quotes, rejects an invalid trailing
  block and reads its destination the same way in both places, and an identifier
  and a word boundary take the ASCII alphabet in both cases (#2122,
  #2123, #2124, #2125, #2126, #2127, #2128).
- A caption's placeholder is any `#` that does not begin a tag (#2165,
  #2169).
- A closer below the container's content column does not count and does not
  rescue a marker-line colon opener whose body folded in, and an item's fence is
  read by one answer rather than two (#2141, #2145, #2147,
  #2149, #2154).
- A definition body's open code fence ends at a line below its column, a bare
  colon opener there is an opener as well as a closer and interrupts a paragraph
  either way, and an empty term marker carries no term text (#2143,
  #2148, #2151, #2152, #2153, #2155).
- An inline element, a footnote reference and an inline note take a glued run of
  attribute blocks merged into one list; the list-marker slot, table rows and
  cells, a citation definition line, an editorial substitution and a comment do
  not (#2136, #2138, #2139, #2140).
- An unresolved reference's source, label and attribute value are HTML-escaped
  like any other text; a lone `[` or `]` among text brackets always escapes in
  the minimal form, as does a `(` after a bare `]`; a quoted attribute value
  reads the whole escape set; extension content and empty-code runs are exempt
  (#2168, #2173, #2358, #2359, #2366, #2378,
  #2581, #2589, #2602, #2610).
- The AST schema refuses three shapes it described and admitted, a bare citation
  is no longer an inline, the profile vocabulary and the schema name the same
  types now that `caption` has left, and eight committed duplicates of the
  published schemas are gone (#2189, #2192, #2197, #2207,
  #2216, #2227, #2228, #2229, #2278).
- A rowspan crossing a row-group boundary keeps its extent and its rows render
  in one body group; a cell contributes no header, label, raw block, definition
  or terminating newline; table-cell text alignment is required in every HTML
  import mode (#2224, #2394, #2422, #2429, #2433).
- A refused placement puts the section where it would go without that marker
  rather than at the document end (#2298, #2299).
- What opens an inline run is defined for every host, not five named ones; a
  dropped fence info token is ruled; the include security obligations get
  clauses of their own; three sentences are restated unchanged (#2142,
  #2150, #2351, #2564, #2594, #2604).
- An unattached continuation payload is placed by its own column inside
  whichever container survives, a `+` at a column no marker column names is
  ordinary text, and an attribute line under an attributed sub-item stays in
  that item (#2334, #2343, #2380, #2406).
- Where the author wrote no class, a mandatory base class leads and a class
  derived from the block's own marker or directive name trails every authored
  attribute (#2336).
- An unsupported HTML element gives way to its children, so `<x>C</x>` imports
  as `C` alone does, plus one `element-unwrapped` row per wrapper, and a block
  child stays a block (#2342).
- Text beside an expanded tab keeps its exact source span; only a synthesized
  column or text merged without an exact source slice omits its position
  (#2356).
- On the Markdown target a link with an unknown fragment and frontmatter both
  survive, a hard break in a pipe-table cell is written as `<br>`, adjacent text
  nodes are written as one run, a raw block of another format is dropped rather
  than written as text, and a raw payload of one blank line stays apart from one
  of no lines (#2362, #2363, #2395, #2502, #2556,
  #2557, #2569, #2574).
- A verbatim line's residue past its fence opener is pinned in both containers,
  and unmarked lines after a code or raw fence indented past a quoted host's
  content column leave the quote (#2420, #2464, #2554).
- A comment span pairs with its own delimiters in every host and is owned by the
  column its opener is written at, a comment and a marker-line quote in a list
  item keep their own extents, an over-indented quote marker cannot reach into a
  code or raw fence's payload, and ownership after a block comment or a fence
  closer below an item's base column follows the item (#2503, #2507,
  #2509, #2525, #2526, #2540, #2624, #2626).
- Lazy continuation ends after a quoted fence and after a nested block that
  leaves no paragraph, and the list, description and `+` attachment boundaries
  follow it at every depth (#2510, #2514, #2515, #2538,
  #2551).
- A list item's tightness is read at every column its paragraph text reaches,
  and a heading's inline spans are read before an outside comment is stripped,
  so a `%%` inside a code span in a heading stays content (#2545,
  #2547, #2548, #2558).
- A footnote body whose blocks all render nothing is an empty body and takes the
  compact spelling (#2570, #2597).
- A container's `[label]` closes on its own bracket and is an inline run, so a
  label holding a link, emphasis, strong or a code span renders instead of
  turning the container into prose (#2572, #2573, #2576,
  #2600).
- A link resolves before an emphasis marker beside its bracket, a link title
  reads the characters it is given, a link inside a span's label keeps its
  destination while only a link inside another link unwraps, and edge whitespace
  around a link or span is ruled (#2376, #2404, #2427,
  #2432, #2565, #2566, #2577, #2578, #2586).
- Each binding's real HTML and Markdown importers are named, BBCode is listed
  among the optional ones, and the converter ledger declares no BBCode drift now
  that all three engines write an empty quote as `>` (#2310, #2311).

### Improvements

- A stored tree may be wrapped in a versioned envelope, with `astVersion`
  versioning the interchange contract rather than the language, and a block
  extension gets a declared home and a required core fallback (#2199,
  #2200, #2222, #2223).
- A table cell may carry block content and a spanning cell publishes its
  resolved extent beside the authored markers, and a line block may publish its
  lines as ranges between two boundaries (#2190, #2191, #2202,
  #2204, #2205, #2226, #2235, #2246).
- Sectioning, small caps and ruby are interchange types, a display equation may
  carry a label and a number, and the node-role table is published once at its
  own address (#2201, #2207, #2209, #2210, #2212,
  #2214, #2220, #2221).
- A node carries an identity that survives an edit, an annotation range need not
  nest, and included, imported and generated content carries a provenance
  sidecar (#2232, #2233, #2242, #2260, #2262).
- A boolean attribute's AST semantics are stated, an annotation range projects
  its offsets by codepoint in a fixed traversal order independent of JSON key
  order, and a source position reads coordinates from the input it names
  (#2206, #2337).
- A table's row groups may carry `headAttrs` and `footAttrs`, filtered and
  bounded like any other attributes, and an explicitly empty set survives
  interchange (#2340).
- A shape no source spells reaches a bounded conversion-diagnostics channel, a
  raw-kept element reports its refused attributes including a refused style
  declaration, and a preserved-attribute row is derived from what the importer
  refused (#2245, #2252, #2263, #2267, #2279,
  #2280, #2287, #2306).
- An importer reporting `fidelity-unverified` still reports each known
  construct-level loss, an ordered task item's lost-checkbox message is pinned
  to one string, a render-time refusal is a lint finding in neither
  machine-readable report, and diagnostic message text is engine-specific
  (#2288, #2292, #2293, #2301, #2309, #2470).
- A titled directive names the region it places, the marker's own attributes
  reach the placed element, and a generated region's own tags follow the
  marker's column while the lines between them stay byte-identical (#2258,
  #2266, #2289, #2296).
- Authored blocks in a placed `::: footnotes` marker render before the endnotes
  section, a nested placement marker in a TOC body renders its div fallback
  before the navigation, and a directive kind's class leads authored attributes
  on a core div and trails them on an extension-owned element (#2346,
  #2348).
- A title or label filling the container body slot is pinned, as is a references
  marker written inside a quote (#2272, #2275, #2303).
- A table span count arriving with no continuation markers is ruled, and what a
  section and a block table cell render to is pinned (#2240, #2248,
  #2249, #2253).
- A citation group whose mode summary contradicts its items is refused
  (#2257).
- A rich image description gets three landing places rather than a fourth field,
  beside the five Pandoc readings where the two models differ in kind
  (#2194, #2196, #2198, #2211).
- HTML import recognizes an explicit code-language hint on a code block and on a
  Sphinx, GitHub or MediaWiki wrapper, with validated tokens and a deterministic
  fallback (#2387, #2393).
- Every lint rule's default trigger is published as a shared resource, and two
  spec modules are split in two (#2397, #2416, #2430,
  #2431).
- Empty and whitespace-only BBCode quotes survive as canonical `>` blocks, and a
  converter case can opt into a byte-exact `expected.crv` check (#2174).
- The Markdown importer rulings markup-carve/carve-js#1922 to
  markup-carve/carve-js#1948 are pinned, the converter corpus reads Markdown
  through cmark-gfm 0.29.0.gfm.13, the four Markdown goldens are re-cut, and the
  list-table import and four HTML import rulings are pinned (#2186,
  #2187, #2188, #2388, #2405, #2424, #2446).
- Newly pinned: a literal vertical tab after a `%%` marker, an ideographic space
  after text, raised-colon paragraph folding at a list column boundary, unpadded
  hyphen-only line-block formatting, nested colon-div spellings of a quoted
  fence, and code and raw fences after a blank-separated quote in a footnote
  body (#2332, #2494, #2496, #2524, #2598).
- The contextual-escape boundary is stated in the Carve-target rules
  (#2511).
- Exactly one column opens a block under a quote in a nested host; elsewhere in
  the band the opener's lines fold into the quote's paragraph, for a heading,
  thematic break and table row as well as a fence (#2607, #2612).

## [0.1.6] - 2026-09-18

### Changed (breaking for AST consumers)

- **A `substitution` node carries its halves as `old` and `new` arrays of
  inline nodes**, replacing the `oldText` and `newText` strings (carve#2094).
  An empty half is `[]`, and both keys are required.

### Added

- **File inclusion and transclusion, PART 9 §19** (carve#291). The reserved
  `{{ }}` directive, with a resolver contract, a cycle guard, a containment
  root, work bounds and dependency reporting (I11).
- **A host-resolver contract for mentions and tags** (carve#2047), keeping
  labels, attributes, the inert fallback and URL-scheme checks.
- **An include-security conformance suite** (carve#1990, carve#1994,
  carve#2003, carve#2021, carve#2022, carve#2060).
- **A version 2 importer-fidelity schema and fixture manifest** across HTML,
  Markdown, Djot, BBCode, Pandoc JSON and PDF extraction JSON (carve#1985).
- **A Carve document on the clipboard is `text/x-carve`** (carve#2050),
  `CARVE-P9-071`.

### Changed

#### Inline parsing

- **A bare delimiter never pairs across an opaque construct** (carve#2027,
  carve#2031). E2a adds link destinations and autolinks.
- **E3 applies to forced openers** (carve#2078). A `{X` of a kind already open
  is content, and a bare same-kind delimiter inside a forced span is content.
- **A braced inline starts its own scope for E3 and E2** (carve#2091), so a
  same-kind span nests inside a braced span of another kind.
- **A lone delimiter of a forced span's own kind is content** (carve#2096), so
  `{==h==}` opens.
- **An unclosed code run ends at an enclosing forced or editorial closer**
  (carve#2051), **its closer is searched for in the rest of the block**
  (carve#2079), and **a trailing line break goes with the strip except in a
  line block** (carve#2089).
- **Substitution content is inline, and only a top-level `~>` splits it**
  (carve#2083). A pair with no top-level arrow is a forced strikethrough.
- **A link destination takes any character except `(`, `)` and whitespace**
  (carve#2069); `[x]()` is not a link.
- **A backtick an earlier construct used up does not stop a later link**
  (carve#2074).

#### Writing (PART 11)

- **A hard break in a single-line slot is flattened to one space** (carve#2067),
  §1b.
- **The §1c ceiling covers a same-kind inline wrapper at any depth**
  (carve#2066), unless a braced span of another kind sits between the two
  levels (carve#2105).
- **The round-trip comparison normalizes a closed list** (carve#2042), §10k,
  `CARVE-P11-043`. N3 adds an empty delimited comment, which separates two
  adjacent code spans; where an escape works, the escape is written
  (carve#2086, carve#2068).
- **The `_` escape condition reads the block's inline content** (carve#2042,
  carve#2046), M1b.
- **`#` is escaped by position, with a heading line's trailing hash run**
  (carve#2048, carve#2052), M1f, `CARVE-P11-044`.
- **A text-final extension name before a bracket node is escaped as `\:`**
  (carve#2068).
- **A block that opens a tight item is written on the marker line**
  (carve#2034).

#### Includes and security

- **A merged include run spans its host pieces** (carve#2044), PART 12 §1a.
- **An unresolved include target's id names where the file would be**
  (carve#2054, carve#2060). A path escaping the root, a target the resolver
  refuses and a URI request keep the directive's spelling.
- **The directive's closer is the first `}}` outside a quoted run**
  (carve#2000).
- **The resolver-call bound and the five include obligations are normative**
  (carve#1995, carve#2019).
- **A containment root that is not absolute is refused** (carve#2004), and a
  refusal does not reveal that an out-of-root target exists (carve#1999).

#### Layout and importers

- **A trailing line after a consumed definition is placed by column-reach**
  (carve#1946).
- **A nested note's floor is its own marker** (carve#1971).
- **A column-0 line after a description-hosted note is a top-level sibling**
  (carve#1974).
- **Markdown raw HTML is imported rather than dropped** (carve#2002).

### Fixed

- **The executable grammar now agrees with the text** on a math or literal
  run inside a forced span (carve#2077), on an attribute block that
  attaches to nothing (carve#2084), and on a caption's `#` number placeholder,
  which is literal inside inline markup and needs no label word before it
  (carve#2112).
- **The table-cell hard-break fixture pins a break at the edge of a span
  inside the cell** (carve#2113), the §1b case the engines diverged on while
  the fixture reported them conformant.

[0.1.8]: https://github.com/markup-carve/carve/compare/0.1.7...0.1.8
[0.1.7]: https://github.com/markup-carve/carve/compare/0.1.6...0.1.7
[0.1.6]: https://github.com/markup-carve/carve/compare/0.1.5...0.1.6
