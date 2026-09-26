# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases before 0.1.6 are archived in
[CHANGELOG-0.1.md](./CHANGELOG-0.1.md).

## [Unreleased]

### Breaking

- The AST spells a generated space as a `non_breaking_space` node, so U+E000 is
  literal content in every string field. A tree stored under the old marker emits
  that character raw into HTML, with no error and no version signal, because the
  AST contract stays `1.0`. Reparsing the source is the only remedy - a stored
  tree cannot tell a generated space from an authored character (carve#2337,
  carve#1242).

### Changed

- Annotation ranges project offsets by codepoint in a fixed traversal order,
  independent of JSON key order, and a source position reads coordinates from the
  input named by `pos.file` (carve#2337).

### Added

- The table AST adds optional `rowGroups.headAttrs` and `rowGroups.footAttrs`, with HTML section rendering and conversion-loss requirements. (markup-carve/carve#2339)

## [0.1.7] - 2026-09-25

### Breaking

- The Markdown target's rich-text spelling is normative (`CARVE-P11-045`), so a
  writer that spelled emphasis, strong, the combined token or strike another way
  now emits different bytes (carve#2177, carve#2180).
- A numeric character reference's hash is escaped under `plain`, `markdown` and
  `djot`, and the escape corpus's expectation changed with it (carve#2171,
  carve#2174).
- `footnote.id` is no longer a permitted AST alias: a definition uses `label`,
  and an ingest refuses `id` (carve#2184).
- Every empty block container renders one blank HTML body line
  (`CARVE-P10-001`), replacing the compact forms (carve#2184).
- A footnote reference spells its target `label` on the wire, and `id` is
  refused rather than aliased (carve#2193, carve#2213).
- A citation item carries its own mode, and the group's `mode` is kept as the
  authored shorthand (carve#2203, carve#2218).
- A named `:::` container is a callout, a directive or a div, so the
  generated-content kinds decode as `directive` and `admonition.kind` refuses
  them (carve#2195, carve#2225, carve#2265, carve#2269).
- A document-wide placement marker places only at document top level: inside any
  block container a `::: footnotes`, `::: references` or `::: bibliography`
  marker renders the plain `<div>` floor instead, while `::: toc`,
  `::: glossary` and `::: index` stay unrestricted (carve#2274, carve#2286,
  carve#2303, carve#2305).
- The Markdown target keeps a list's tightness wherever CommonMark can express
  it, which changes the bytes emitted for loose lists (carve#2281, carve#2294).
- An importer reads a denied-scheme destination as its content instead of
  dropping the link (carve#2254, carve#2255).
- A Markdown task label that is also a reference definition reads as the
  checkbox (carve#2273, carve#2291).
- A directive kind whose element cannot hold a paragraph keeps its title and
  label tokens outside that element (carve#2264, carve#2276).

### Fixes

- PART 2's no-trailing-whitespace rule names a comment in both of its lists: a
  `%%` line's text is a content line, where exactly one space or tab after the
  marker is the separator, and a `%%%` block's body is payload that keeps its
  bytes (#2314).
- The binding contract names each binding's real HTML and Markdown importers and
  lists BBCode among the optional ones, in place of out-of-scope reasons that
  described APIs the bindings had outgrown, and the converter ledger declares no
  BBCode drift now that all three engines write an empty quote as `>` (#2310,
  #2311).
Most of these move the shipped oracle rather than a rule: the executable
reference and the Ohm grammar disagreed with normative text that already
existed.

- A reference definition reads both title quotes, rejects an invalid trailing
  block, and follows `link_destination` in both hand-spelled destination readers
  (carve#2122, carve#2123, carve#2124).
- Every identifier production and every word-boundary class reads the ASCII
  alphabet the clauses spell, in both directions (carve#2125, carve#2126,
  carve#2127, carve#2128).
- A delimiter after `_` or `/` opens only when that one pairs, `bare_opener`
  reads its own underscore term, and a name run gives up the underline closer it
  cannot keep (carve#2129, carve#2130, carve#2132, carve#2134, carve#2156,
  carve#2160).
- The combined bold-italic token takes any character as content, including an
  asterisk run, and runs the PART 9 §9 delimiter stack (carve#2131, carve#2133,
  carve#2135, carve#2137, carve#2159, carve#2162).
- A quote is decided by the glyph that stood before its run, and an escaped
  quote keeps its place in that chain (carve#2158, carve#2161, carve#2164,
  carve#2166).
- A code span pairs a run of any length and refuses a run past the last tier
  (carve#2144, carve#2146).
- A comment inside a forced span or the combined token ends at that construct's
  closer (carve#2167, carve#2170).
- A form feed or a no-break space is content wherever whitespace is tested
  (carve#2157, carve#2163).
- A caption's placeholder is any `#` that does not begin a tag, so most captions
  were going unnumbered (carve#2165, carve#2169).
- An item's fence is read by one §10 I4 answer rather than two (carve#2141).
- A closer below the container's content column does not count, and one does not
  rescue a marker-line colon opener whose body folded in (carve#2145,
  carve#2147, carve#2149, carve#2154).
- A definition body's open code fence ends at a line below its column, and a
  bare colon opener there is an opener as well as a closer (carve#2143,
  carve#2148, carve#2152).
- A bare colon run interrupts a paragraph whether or not a line follows it
  (carve#2151, carve#2153).
- An empty term marker in a description body carries no term text, so the line
  folds into the body (carve#2155).
- An inline element takes a glued run of attribute blocks merged into one list,
  while the list-marker slot, table rows and cells and a citation definition
  line stay at one block (carve#2136, carve#2139).
- A footnote reference and an inline note take an attribute run; editorial
  substitution and comment take none (carve#2138, carve#2140).
- An unresolved reference's literal source, label and attribute value are
  HTML-escaped like any other text (carve#2168, carve#2173).
- The AST schema refuses three shapes it described and admitted: a non-block in
  `children`, a `citation` required to carry `pos`, and a reference node with no
  target (carve#2189, carve#2192, carve#2197).
- A bare citation is no longer an inline, a shape every engine refused
  (carve#2227, carve#2228, carve#2229).
- The profile vocabulary and the schema name the same types, and `caption`
  leaves the vocabulary (carve#2207, carve#2216).
- A rowspan crossing a row-group boundary keeps its extent, and the rows it
  crosses render in one body group (carve#2224).
- A refused placement puts the section where it would go without that marker
  rather than at the document end, which was false for a document also carrying
  a top-level marker (carve#2298, carve#2299).
- Eight committed duplicates of the published schemas are gone, one of which had
  already drifted from the resource it copies (carve#2278).
- The closer-lookahead sentence under `CARVE-P0-014` states its answer plainly,
  and the wording of two clauses is clearer with the meaning unchanged
  (carve#2142, carve#2150).

### Improvements

- A stored tree may be wrapped in a versioned envelope, with `astVersion`
  versioning the interchange contract rather than the language (carve#2199,
  carve#2222).
- A block extension gets a declared home and a required core fallback, which its
  inline twin never had (carve#2200, carve#2223).
- A table cell may carry block content, and a spanning cell publishes its
  resolved extent beside the authored markers (carve#2190, carve#2191,
  carve#2204, carve#2205).
- A line block may publish its lines, and a line is a range between two
  boundaries (carve#2202, carve#2226, carve#2235, carve#2246).
- Sectioning, small caps and ruby are interchange types, and a display equation
  may carry a label and a number (carve#2207, carve#2209, carve#2210,
  carve#2212, carve#2214, carve#2216, carve#2221).
- The node-role table is derived once and published at its own `$id`, so each
  engine stops deriving it (carve#2201, carve#2220).
- A node carries an identity that survives an edit, and an annotation range need
  not nest (carve#2232, carve#2242, carve#2260).
- Included, imported and generated content carries a provenance sidecar
  (carve#2233, carve#2262).
- A shape no source spells reaches a bounded conversion-diagnostics channel
  (carve#2245, carve#2252).
- A titled directive names the region it places, and the marker's own attributes
  reach the placed element (carve#2258, carve#2266).
- A generated region's own tags follow the marker's column, while the lines
  between them are the byte-identical contract (`CARVE-P10-010`), which settles
  three readings of one sentence (carve#2289, carve#2296).
- A raw-kept element reports its refused attributes, and a refused style
  declaration is one of them (carve#2263, carve#2267, carve#2280, carve#2287).
- A preserved-attribute row says it one way, and the attributes owing a row are
  derived from what the importer would have refused rather than listed
  (carve#2279, carve#2306).
- An importer reporting `fidelity-unverified` still reports each known
  construct-level loss, and the message an ordered task item's lost checkbox
  carries is pinned to one string (carve#2288, carve#2301, carve#2309).
- A table span count arriving with no continuation markers is ruled
  (carve#2240, carve#2249).
- What a section and a block table cell render to is pinned (carve#2248,
  carve#2253).
- A citation group whose mode summary contradicts its items is refused
  (carve#2257).
- A render-time refusal is a lint finding and appears in neither
  machine-readable report (carve#2292, carve#2293).
- A rich image description gets three landing places rather than a fourth field,
  beside the five Pandoc readings where the two models differ in kind
  (carve#2194, carve#2196, carve#2198, carve#2211).
- A boolean attribute's AST semantics are stated (carve#2206).

### Corpus

- The conformance corpus grows from 1740 to 1869 documents, sections 473 to 498,
  and every ruling and reference fix above is pinned there.
- Empty and whitespace-only BBCode quotes survive as canonical `>` blocks, and a
  converter case can opt into a byte-exact `expected.crv` check where rendering
  cannot tell the ruled spelling apart (carve#2174).
- A title or label filling the container body slot is pinned, as is a references
  marker written inside a quote (carve#2272, carve#2275, carve#2303).
- The Markdown importer rulings from markup-carve/carve-js#1922 through
  markup-carve/carve-js#1948 are pinned, and the converter corpus reads Markdown
  meaning through cmark-gfm 0.29.0.gfm.13 (carve#2186, carve#2187, carve#2188).

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

[Unreleased]: https://github.com/markup-carve/carve/compare/0.1.7...HEAD
[0.1.7]: https://github.com/markup-carve/carve/compare/0.1.6...0.1.7
[0.1.6]: https://github.com/markup-carve/carve/compare/0.1.5...0.1.6
