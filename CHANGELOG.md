# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases before 0.1.6 are archived in
[CHANGELOG-0.1.md](./CHANGELOG-0.1.md).

## [Unreleased]

### Breaking

- Markdown bytes change: rich text is respelled, a numeric character reference's
  hash is escaped under `plain`, `markdown` and `djot`, and a loose list keeps
  its tightness (carve#2171, carve#2174, carve#2177, carve#2180, carve#2281,
  carve#2294).
- Markdown output reads correctly in a GFM reader, changing block-cell images,
  row-head counts, a whitespace code line, a narrow header, autolinks, a cell's
  soft break, a list table and a bare email (carve#2371, carve#2374, carve#2381,
  carve#2391, carve#2392, carve#2398, carve#2402, carve#2403, carve#2408,
  carve#2409, carve#2413, carve#2418, carve#2421, carve#2443, carve#2456).
- A footnote definition and reference spell the target as `label` and refuse
  `id`, and a citation item carries its own mode while the group keeps the
  authored shorthand (carve#2184, carve#2193, carve#2203, carve#2213,
  carve#2218).
- Every empty block container renders one blank HTML body line, replacing the
  compact forms (carve#2184).
- A named `:::` container is a callout, a directive or a div; an admonition
  refuses the generated-content kinds, and a kind whose element cannot hold a
  paragraph keeps its title and label outside it (carve#2195, carve#2225,
  carve#2264, carve#2265, carve#2269, carve#2276).
- `::: footnotes`, `::: references` and `::: bibliography` place only at
  document top level and render the plain `<div>` floor anywhere else, while
  `::: toc`, `::: glossary` and `::: index` stay unrestricted (carve#2274,
  carve#2286, carve#2303, carve#2305).
- An importer writes different Carve for edge whitespace around a link or span,
  a linear `<math>` with no TeX, a formula beside a fallback image, a
  denied-scheme destination, and an empty `<ul>` or `<ol>`, now dropped with an
  `element-dropped` warning (carve#2254, carve#2255, carve#2361, carve#2365,
  carve#2367, carve#2375).
- Import answers also change what an importer writes for adjacent definition
  lists, a figure's attribute line, a multi-line comment in a cell, an empty
  heading, a pipe or line break in an attribute value, a term-less description,
  a heading comment, and a Markdown task label that doubles as a reference
  definition (carve#2273, carve#2291, carve#2369, carve#2370, carve#2372,
  carve#2383, carve#2384, carve#2385, carve#2386, carve#2396, carve#2399,
  carve#2419, carve#2441, carve#2455).
- A generated space is its own AST node, so U+E000 is literal content in every
  string field. A tree stored under the old marker emits that character raw into
  HTML; only reparsing the source fixes it (carve#1242, carve#2337).
- AST validation tightens: `directive.children` is required, `admonition.kind`
  may not be empty, and the render-loss `code` enum closes at two codes, a
  dropped table section attribute now reporting `field-unspellable` on the
  conversion-diagnostics channel (carve#2335, carve#2344, carve#2346).
- A column is counted in codepoints, which moves every position reported on a
  line holding astral or combining characters (carve#2400).
- An unquoted attribute value cannot hold characters that would restructure the
  block, a key-value class folds into the class slot, no pad follows an opener a
  line break follows, and a summary flattens into the title (carve#2434,
  carve#2442, carve#2447).
- A definition term has no content column at any depth, and a comment or a
  definition under a term folds at every depth (carve#2411, carve#2426,
  carve#2458).
- `code_block.content` is literal payload text: a nonempty code block keeps its
  final line break, an unclosed fence at the end of the document keeps the
  absence of one, and an empty fence carries no payload newline (carve#2560,
  carve#2579, carve#2603).
- A comment no longer lets a retained list marker below an item's content column
  open a child list; the marker stays paragraph text, and two spaces still open
  a sublist (carve#2619).

### Fixes

- A `%%` line's text is a content line, separated by exactly one space or tab; a
  `%%%` block keeps its payload bytes and the whitespace beyond its container's
  prefix; a comment inside a forced span or the combined token ends at that
  closer; and a trailing `%%` is recognized after a tab and in any inline text
  (carve#2167, carve#2170, carve#2314, carve#2535, carve#2552, carve#2562,
  carve#2599).
- A delimiter after `_` or `/` opens only when that one pairs, a name run gives
  up the underline closer it cannot keep, and the combined bold-italic token
  takes any character as content, including an asterisk run (carve#2129,
  carve#2130, carve#2131, carve#2132, carve#2133, carve#2134, carve#2135,
  carve#2137, carve#2156, carve#2159, carve#2160, carve#2162).
- A quote is decided by the glyph before its run and an escaped quote keeps its
  place in that chain; a code span pairs any run length and refuses one past the
  last tier; a form feed or no-break space is content wherever whitespace is
  tested (carve#2144, carve#2146, carve#2157, carve#2158, carve#2161,
  carve#2163, carve#2164, carve#2166).
- A reference definition reads both title quotes, rejects an invalid trailing
  block and reads its destination the same way in both places, and an identifier
  and a word boundary take the ASCII alphabet in both cases (carve#2122,
  carve#2123, carve#2124, carve#2125, carve#2126, carve#2127, carve#2128).
- A caption's placeholder is any `#` that does not begin a tag (carve#2165,
  carve#2169).
- A closer below the container's content column does not count and does not
  rescue a marker-line colon opener whose body folded in, and an item's fence is
  read by one answer rather than two (carve#2141, carve#2145, carve#2147,
  carve#2149, carve#2154).
- A definition body's open code fence ends at a line below its column, a bare
  colon opener there is an opener as well as a closer and interrupts a paragraph
  either way, and an empty term marker carries no term text (carve#2143,
  carve#2148, carve#2151, carve#2152, carve#2153, carve#2155).
- An inline element, a footnote reference and an inline note take a glued run of
  attribute blocks merged into one list; the list-marker slot, table rows and
  cells, a citation definition line, an editorial substitution and a comment do
  not (carve#2136, carve#2138, carve#2139, carve#2140).
- An unresolved reference's source, label and attribute value are HTML-escaped
  like any other text; a lone `[` or `]` among text brackets always escapes in
  the minimal form, as does a `(` after a bare `]`; a quoted attribute value
  reads the whole escape set; extension content and empty-code runs are exempt
  (carve#2168, carve#2173, carve#2358, carve#2359, carve#2366, carve#2378,
  carve#2581, carve#2589, carve#2602, carve#2610).
- The AST schema refuses three shapes it described and admitted, a bare citation
  is no longer an inline, the profile vocabulary and the schema name the same
  types now that `caption` has left, and eight committed duplicates of the
  published schemas are gone (carve#2189, carve#2192, carve#2197, carve#2207,
  carve#2216, carve#2227, carve#2228, carve#2229, carve#2278).
- A rowspan crossing a row-group boundary keeps its extent and its rows render
  in one body group; a cell contributes no header, label, raw block, definition
  or terminating newline; table-cell text alignment is required in every HTML
  import mode (carve#2224, carve#2394, carve#2422, carve#2429, carve#2433).
- A refused placement puts the section where it would go without that marker
  rather than at the document end (carve#2298, carve#2299).
- What opens an inline run is defined for every host, not five named ones; a
  dropped fence info token is ruled; the include security obligations get
  clauses of their own; three sentences are restated unchanged (carve#2142,
  carve#2150, carve#2351, carve#2564, carve#2594, carve#2604).
- An unattached continuation payload is placed by its own column inside
  whichever container survives, a `+` at a column no marker column names is
  ordinary text, and an attribute line under an attributed sub-item stays in
  that item (carve#2334, carve#2343, carve#2380, carve#2406).
- Where the author wrote no class, a mandatory base class leads and a class
  derived from the block's own marker or directive name trails every authored
  attribute (carve#2336).
- An unsupported HTML element gives way to its children, so `<x>C</x>` imports
  as `C` alone does, plus one `element-unwrapped` row per wrapper, and a block
  child stays a block (carve#2342).
- Text beside an expanded tab keeps its exact source span; only a synthesized
  column or text merged without an exact source slice omits its position
  (carve#2356).
- On the Markdown target a link with an unknown fragment and frontmatter both
  survive, a hard break in a pipe-table cell is written as `<br>`, adjacent text
  nodes are written as one run, a raw block of another format is dropped rather
  than written as text, and a raw payload of one blank line stays apart from one
  of no lines (carve#2362, carve#2363, carve#2395, carve#2502, carve#2556,
  carve#2557, carve#2569, carve#2574).
- A verbatim line's residue past its fence opener is pinned in both containers,
  and unmarked lines after a code or raw fence indented past a quoted host's
  content column leave the quote (carve#2420, carve#2464, carve#2554).
- A comment span pairs with its own delimiters in every host and is owned by the
  column its opener is written at, a comment and a marker-line quote in a list
  item keep their own extents, and ownership after a block comment or a fence
  closer below an item's base column follows the item (carve#2503, carve#2507,
  carve#2509, carve#2525, carve#2526, carve#2540, carve#2624).
- Lazy continuation ends after a quoted fence and after a nested block that
  leaves no paragraph, and the list, description and `+` attachment boundaries
  follow it at every depth (carve#2510, carve#2514, carve#2515, carve#2538,
  carve#2551).
- A list item's tightness is read at every column its paragraph text reaches,
  and a heading's inline spans are read before an outside comment is stripped,
  so a `%%` inside a code span in a heading stays content (carve#2545,
  carve#2547, carve#2548, carve#2558).
- A footnote body whose blocks all render nothing is an empty body and takes the
  compact spelling (carve#2570, carve#2597).
- A container's `[label]` closes on its own bracket and is an inline run, so a
  label holding a link, emphasis, strong or a code span renders instead of
  turning the container into prose (carve#2572, carve#2573, carve#2576,
  carve#2600).
- A link resolves before an emphasis marker beside its bracket, a link title
  reads the characters it is given, a link inside a span's label keeps its
  destination while only a link inside another link unwraps, and edge whitespace
  around a link or span is ruled (carve#2376, carve#2404, carve#2427,
  carve#2432, carve#2565, carve#2566, carve#2577, carve#2578, carve#2586).
- Each binding's real HTML and Markdown importers are named, BBCode is listed
  among the optional ones, and the converter ledger declares no BBCode drift now
  that all three engines write an empty quote as `>` (#2310, #2311).

### Improvements

- A stored tree may be wrapped in a versioned envelope, with `astVersion`
  versioning the interchange contract rather than the language, and a block
  extension gets a declared home and a required core fallback (carve#2199,
  carve#2200, carve#2222, carve#2223).
- A table cell may carry block content and a spanning cell publishes its
  resolved extent beside the authored markers, and a line block may publish its
  lines as ranges between two boundaries (carve#2190, carve#2191, carve#2202,
  carve#2204, carve#2205, carve#2226, carve#2235, carve#2246).
- Sectioning, small caps and ruby are interchange types, a display equation may
  carry a label and a number, and the node-role table is published once at its
  own address (carve#2201, carve#2207, carve#2209, carve#2210, carve#2212,
  carve#2214, carve#2220, carve#2221).
- A node carries an identity that survives an edit, an annotation range need not
  nest, and included, imported and generated content carries a provenance
  sidecar (carve#2232, carve#2233, carve#2242, carve#2260, carve#2262).
- A boolean attribute's AST semantics are stated, an annotation range projects
  its offsets by codepoint in a fixed traversal order independent of JSON key
  order, and a source position reads coordinates from the input it names
  (carve#2206, carve#2337).
- A table's row groups may carry `headAttrs` and `footAttrs`, filtered and
  bounded like any other attributes, and an explicitly empty set survives
  interchange (carve#2340).
- A shape no source spells reaches a bounded conversion-diagnostics channel, a
  raw-kept element reports its refused attributes including a refused style
  declaration, and a preserved-attribute row is derived from what the importer
  refused (carve#2245, carve#2252, carve#2263, carve#2267, carve#2279,
  carve#2280, carve#2287, carve#2306).
- An importer reporting `fidelity-unverified` still reports each known
  construct-level loss, an ordered task item's lost-checkbox message is pinned
  to one string, a render-time refusal is a lint finding in neither
  machine-readable report, and diagnostic message text is engine-specific
  (carve#2288, carve#2292, carve#2293, carve#2301, carve#2309, carve#2470).
- A titled directive names the region it places, the marker's own attributes
  reach the placed element, and a generated region's own tags follow the
  marker's column while the lines between them stay byte-identical (carve#2258,
  carve#2266, carve#2289, carve#2296).
- Authored blocks in a placed `::: footnotes` marker render before the endnotes
  section, a nested placement marker in a TOC body renders its div fallback
  before the navigation, and a directive kind's class leads authored attributes
  on a core div and trails them on an extension-owned element (carve#2346,
  carve#2348).
- A title or label filling the container body slot is pinned, as is a references
  marker written inside a quote (carve#2272, carve#2275, carve#2303).
- A table span count arriving with no continuation markers is ruled, and what a
  section and a block table cell render to is pinned (carve#2240, carve#2248,
  carve#2249, carve#2253).
- A citation group whose mode summary contradicts its items is refused
  (carve#2257).
- A rich image description gets three landing places rather than a fourth field,
  beside the five Pandoc readings where the two models differ in kind
  (carve#2194, carve#2196, carve#2198, carve#2211).
- HTML import recognizes an explicit code-language hint on a code block and on a
  Sphinx, GitHub or MediaWiki wrapper, with validated tokens and a deterministic
  fallback (carve#2387, carve#2393).
- Every lint rule's default trigger is published as a shared resource, and two
  spec modules are split in two (carve#2397, carve#2416, carve#2430,
  carve#2431).
- Empty and whitespace-only BBCode quotes survive as canonical `>` blocks, and a
  converter case can opt into a byte-exact `expected.crv` check (carve#2174).
- The Markdown importer rulings markup-carve/carve-js#1922 to
  markup-carve/carve-js#1948 are pinned, the converter corpus reads Markdown
  through cmark-gfm 0.29.0.gfm.13, the four Markdown goldens are re-cut, and the
  list-table import and four HTML import rulings are pinned (carve#2186,
  carve#2187, carve#2188, carve#2388, carve#2405, carve#2424, carve#2446).
- Newly pinned: a literal vertical tab after a `%%` marker, an ideographic space
  after text, raised-colon paragraph folding at a list column boundary, unpadded
  hyphen-only line-block formatting, nested colon-div spellings of a quoted
  fence, and code and raw fences after a blank-separated quote in a footnote
  body (carve#2332, carve#2494, carve#2496, carve#2524, carve#2598).
- The contextual-escape boundary is stated in the Carve-target rules
  (carve#2511).
- Exactly one column opens a block under a quote in a nested host; elsewhere in
  the band the opener's lines fold into the quote's paragraph, for a heading,
  thematic break and table row as well as a fence (carve#2607, carve#2612).

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

[Unreleased]: https://github.com/markup-carve/carve/compare/0.1.6...HEAD
[0.1.6]: https://github.com/markup-carve/carve/compare/0.1.5...0.1.6
