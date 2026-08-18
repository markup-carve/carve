# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **A vertical table-cell marker requires a horizontal partner.** `|^ x` and `|v x` remain visible content; paired runs such as `|<^`, `|~~`, and `|v>` carry both axes. Corpus 373.
- **A quote is reached by its marker, and a column never reaches into one** (carve#1384). A line writing no `>` is in no quote whatever column it lands on; it folds into the deepest open paragraph, renders where it was written, and registers nothing. Corpus 369.
- **An unterminated fence at a container's content column opens no block** (carve#1387). Section 10 I4 asks for a closer; without one the line is paragraph text, the paragraph stays open, and a flush-left line below folds into it. Corpus 367.
- **A raw block keeps the blank line at the end of its payload** (carve#1389). The payload is every line between the delimiters; the container and whether the closer was written are not parameters. Corpus 366.

## [0.1.3] - 2026-08-18

### Added

- **PART 11 §1b: a flatten preserves the boundary it dissolves** (carve#1325). Where a producer flattens block content into an inline-only slot, a separator is required between two former siblings that each contribute a token, and one space is sufficient iff re-reading the slot draws no token from both sides of the join.
- **PART 12 §18: a citation definition is a node** (carve#1276). A `[@key]: entry` bibliography line serializes as `citation_definition` with `key`, `children`, `attrs` and `pos`. Tier-2.
- **PART 12 §17: a figure may wrap a table, and no Carve source spells it** (carve#1211, carve#1236). An interchange-only shape an importer can produce.
- **PART 12 §15: a table may carry a row grouping**, and **PART 12 §14: a caption may carry a structured short caption** (carve#1117).
- **PART 9 §21a: delimited inline comments, `{% … %}`** (carve#1239).
- **PART 9 §4c: composite figures** (carve#1122). A bare `::: figure` container is a captionable host whose captionable children are its panels, with target rules at PART 11 §10g and the node shape at PART 12 §16.
- **A compact language attribute, `{:TAG}`** (carve#1114).
- **The HTML import contract is specified** (carve#1098, carve#1286), with two new diagnostic codes, `structure-unspellable` and `encoding-assumed` (carve#1216, carve#1235), a defined `path` on every diagnostic (carve#1257), and the source's list tightness preserved (carve#1210).

### Changed

Container boundaries, and what a line at a content column does. These are one family and an implementer building any of them should read them together:

- **At a container's content column, a block ends the paragraph it sits under** (carve#1357, also settling the `dd` sub-question on carve#1350). What the block RENDERS is not a parameter; PART 1 S4 carries the property instead of an enumeration of constructs. The rule is over the BLOCK, not over its first line.
- **A definition at a container's content column ends the paragraph, not the container** (carve#1350). §10 I5 makes it an interrupter; the container ends because the next line arrives at column 0.
- **A footnote definition's block runs to the end of its body** (carve#1363), blank lines and all, so one definition does not answer differently by how its body is laid out.
- **A definition's column is reached by composing the strips, not by walking the prefix** (carve#1368, PART 9 §24 C5). Each strip is taken against the column the one before it hands out.
- **A blank line ends the open paragraph, whatever container stands above it** (carve#1379). An unterminated `:::` div reaches no further past a blank than a terminated one.
- **A blank line before a sibling marker separates the items, whatever consumed it** (carve#1383, §17 L1). carve#326 C's interior blank is untouched.
- **Prose reopens an item's paragraph, and a continuation row joins the row above it in its OWN container** (carve#1370). S4 does not ask whether the open paragraph is the container's first block.
- **A quote inside a quote is asked what it ends on** (carve#1355). S4's recursive question was never put to a nested quote.
- **A table is a table however its last row is spelled** (carve#1348), and **a continuation row joins the row above it whatever that row's cells hold** (carve#1354). A continuation row is a row only where a table is above it (carve#1349), and the delimiter row is what makes the one case that declines.
- **No open paragraph, no lazy line, at every depth and after an interrupter** (carve#1346). The clause binds even where the unmatched container is a list, so `- - # H` answers as `- # H` does.
- **Lazy continuation extends an open paragraph and nothing else** (carve#1280), and **a continuation marker attaches one block** (carve#1290, §17 L3).
- **A floating attribute is scoped to the container that holds it** (carve#1281, §15 A4); an unconsumed one is dropped and reported.
- **An attribute line after a `+` continuation marker attributes the block the marker attaches** (carve#1238).
- **A tab after a fence or frontmatter opener is decided by its position** (carve#1295, carve#1285). Before content it is the marker separator and the construct does not open; at end of line it is trailing whitespace and the opener opens.
- **A comment fence hides its body at every column, not only at column 0** (carve#1309, §28). Seven documents pin it, one per spelling an engine can get wrong on its own.

Inline content and line blocks:

- **A line block hardens a soft break at every depth** (carve#1351, PART 9 §23). §23 hardens by NODE KIND, not by depth; PART 11 §7c is amended alongside, since its bare-newline permission rests on this reading.
- **A line block's last body line keeps its backslash** (carve#1340, PART 11 §7c). At a stanza's end there is no boundary to harden, so the bare newline is not equivalent.
- **A comment line is removed at the block layer** (carve#1339, carve#1333). `comment_line` is a block and a trailing `%%` after content is `inline_comment`; §23's "wherever it appears" means in whichever container, never in whichever inline context.
- **An unclosed inline run in a line block reaches the end of the block** (carve#1282), carrying a newline rather than a space.
- **An unclosed verbatim run in a table row stops at the row's closing pipe** (carve#1284, carve#1293), with the `+` continuation and the escaped pipe ruled alongside.
- **A label that begins with an at sign is not a reference label** (carve#1302). It resolves to nothing and the source text stands.
- **A note inside an unresolved reference is not a reference** (carve#1198, PART 9R R2).
- **Footnote labels are matched exactly, and never cross a line** (carve#1112).
- **A heading id is derived from the heading's text content** (carve#1283). An inline either contributes its literal text or contributes nothing, decided by the CONSTRUCT rather than by what it renders.
- **An abbreviation expands inside an inline container** (carve#1151), **an abbreviation line in a list item body is the paragraph it renders** (carve#1267), and **an explicit `abbr` semantic attribute outranks automatic expansion** (carve#1127).
- **Semantic spans split by tier, leftover attributes ride the outermost element** (carve#1146), and **compact semantic span attributes are portable core syntax** (carve#1124).

Attributes and tables:

- **A cell's attributes bind after its kind and alignment markers** (carve#1224, PART 9 §5).
- **A table header cell states what it heads** (carve#1149).
- **Two adjacent attributes need a separator** (carve#1157), **a boolean and a key/value of the same name are one attribute** (carve#1125), **a structural attribute leads the author's own** (carve#1090), and **a mandatory base class keeps the author's class slot in place** (carve#1168, carve#1170).

Canonical form and the non-HTML targets:

- **PART 11 §6e: a table cell's content is padded** (carve#1233), **PART 11 §6d: a code fence opener is written glued to its info string** (carve#1219), and **PART 11 §6c: a value-less attribute is written as a boolean** (carve#1137).
- **PART 11 §8b: the Markdown target's authored escape narrows too** (carve#1321), and **a line's content position is after its container prefix** (carve#1332). The position is read on the emitted line past every container prefix, so `> \# heading` does not come back as a heading.
- **The Markdown target escapes an angle bracket only where it opens markup** (carve#1172, carve#1148).
- **PART 11 §10h: the plain-text target preserves list depth** (carve#1084). The clause now carries its own number rather than sitting inside §8a's body (carve#1365); the `10d` slot of that same run is retired, since carve#1213 withdrew the clause it named, so the run reads `10c`, `10e`.
- **PART 11 §10e: a presentation target keeps a caption, a fence title and a fence label** (carve#1179), and **PART 11 §10f: a referenced abbreviation definition splits by target** (carve#1185).
- **Bidi controls are stripped by presentation target** (carve#1082, carve#1083).

### Security

- **A list-valued attribute is probed at every candidate, not at its head** (carve#1326, §25). The probe read the value's leading scheme, which vouches for the whole value only where the whole value is one URL, so `srcset="safe.png 1x, javascript:alert(1) 2x"` passed on all three engines.
- **The token pass runs in addition to the value-wide probe, not instead of it** (carve#1328, §25). The paragraph read as an exchange, and one engine shipped token-only; the value-wide probe strips ASCII whitespace before reading a scheme and the split does not, so dropping it is a regression rather than a neutral variant.

### Fixed

Defects in the executable spec and its corpus, where the engines already answered correctly:

- **Only lazy folding demotes a marker-line colon opener** (carve#1382). A `:::` opener alone on a marker line with a blank after it was read as literal text; the demotion guard asked whether the body was non-empty rather than whether any folding happened.
- **A task item's checkbox is not decided by its first block** (carve#1381). `- [ ] > q` dropped the checkbox the author wrote; the `<li>` opener was built in two branches and only the inline one consulted it.
- **A bracketed construct spans a line boundary like any other inline content** (carve#1352). Every bracketed content run carried a newline guard, so a link, a semantic span, an alt text, an inline note, `:name[...]`, the edit family and the forced family all read as literal text across a boundary. The physical-line identifiers deliberately keep the guard.

Defects in the specification text:

- **The U+E000 no-break space sentinel is documented on all four fields that carry it** (carve#1242, PART 12 §3). It was named on `text.value` alone; `raw_block.content` is named as excluded.
- **An image's alt text closes where a link's text closes** (carve#1197). The production wrote `alt_text = {character - ']'}` four lines under the statement that an image differs from a link only in its leading `!` and its output, so `![t[z]][r]` was not an image at all.

## [0.1.2] - 2026-08-10

### Changed

- **A column-zero link or footnote definition closes an open list item**
  (carve#1045). Definitions are column-scoped: at the item's content column the
  definition belongs to the item; at a nonzero column below it the line is
  literal lazy text and does not register; at document column zero it is a
  document-level interrupter, so the following block is outside the list.
  Comments retain their explicit column-independent invisibility exception.
  Corpus category 286 pins link and footnote definitions plus both column
  controls.

### Added

- **The AST serialization format is specified (new PART 12).** A parsed document
  is exchangeable: an implementation may serialize its AST to JSON, and a
  consumer written against one engine must be able to read another's output.
  Nothing specified this before, and the engines' internal field names already
  differed for the same node, so three incompatible dialects were the default
  outcome rather than a risk. The shape is carve-js's. Field names are spec
  surface exactly as node-type names are. `pos` is required on the wire.

  Clauses added on top of it in this release:

  - **§3a: the serialized AST is PRE-RESOLVE.** The tree records what the author
    wrote. `[getting started][]` publishes a `link` carrying `ref` and `rawRef`,
    resolved or not. A RESOLVED reference keeps its destination too - `href` is
    empty only where nothing resolved the reference - and `ref` for the collapsed
    `[label][]` form is the DERIVED label, since that is the label the reference
    resolves by. This removes the need for a `raw_text` document node.
  - **§4: a span begins at the construct's opening markup.** A node's `pos`
    covers the construct as WRITTEN - the `>`, the `#`, the list marker and the
    indentation placing it, the `[` - so a span round-trips to the source text
    that produced the node. A trailing attribute block is part of the span
    (`*x*{#i}` gives the `strong` 0..7, not 0..3). A discontiguous node's span is
    its FIRST fragment; first-offset-to-last-offset is forbidden, because in
    corpus 64 that range contains a sibling cell entirely. Two nodes keep a
    content-only span: the inner half of a combined `/*x*/`, and a table cell.
    Containment is now asserted in a pass of its own rather than derived from the
    convention.
  - **§4: position tracking may be opt-in, serialization may not.** An
    implementation may gate tracking behind a parse option and must enable it
    when asked to serialize. What is forbidden is a serialized document without
    positions.
  - **§7: hoisting a definition is not the same as defining it.** PART 12 §7 now
    covers every definition kind, not only footnotes: an `abbreviation_def`
    authored inside a div, list item or block quote is a child of the DOCUMENT.
    It expands occurrences only when it was written at document level - §7's
    rationale sentence was about tree shape and was reading as though it settled
    expansion too.
  - **§12(d): an ingest validates the whole payload against
    `resources/ast-schema.json`.** Types and required fields together, refused at
    decode with the typed error §12 already requires. One clause rather than a
    row per field: the schema is the list. Ruling them one at a time is what
    produced the state this replaces - a root `children` of `null` read as an
    empty document by two engines, `attrs: {"class":"x"}` rendered as
    `class="x"` by a third, `text.value: 7` rendered `<p>7</p>`. The shipped
    schema was measured against all sixteen shapes and rejects every one.

  Consequence for producers: the schema rejects trees two engines accept today,
  and every future schema addition becomes a potential rejection for a producer
  that has not caught up.

- **The canonical source writer is specified (new PART 11).** `carve fmt` and the
  `carve` render target had no normative text at all, so their behavior was
  defined only by three implementations happening to agree. PART 11 pins the
  invariants (`parse(fmt(x)) == parse(x)` and idempotence) and states the
  escaping rule: a character is escaped if and only if omitting the escape would
  change the re-parsed AST. A static per-character table cannot implement it -
  `[` is literal alone but an opener in `[a](b)`. The conformant strategy pins
  the output while leaving the computation free.

  Amended after implementing it, each correction forced by the parser rather than
  chosen:

  - The escaping decision is **document-scoped**, not per line. A line re-parsed
    alone has lost the document's link-reference and footnote definitions.
  - The two renders are **compared with each other**, not against the document
    being written, which would inherit the writer's existing round-trip gaps and
    flip the decision between passes.
  - The **caret is unconditional**, because its escape carries information the
    AST records separately.
  - **§1 is equality MODULO ESCAPING.** `escaped_text` and `text` compare equal,
    and an adjacent run compares as one text node. Without this, §1 and §5
    contradicted each other for every document containing a quote.
  - **§2a: the writer does not substitute one construct for another.**
    `to_html(fmt(x)) == to_html(x)` holding is necessary, not sufficient -
    carve-rs wrote `* %%` as `* +`, turning a line comment into the continuation
    marker.
  - **§1 records a known gap**: `parse(fmt(x)) == parse(x)` is met by no engine
    today. A corpus-wide sweep tracks the rest in markup-carve/carve#369.

- **PART 11 §7: the Markdown target's escaping rule.** There was no normative
  text for it at all. Markdown metacharacters are escaped unconditionally; an
  `escaped_text` node is emitted as an escape whatever the character; nothing
  else is escaped. The middle rule is the divergent one: `\-\-` was written
  precisely so a downstream processor with smart punctuation on would not read an
  en dash, and the characters this matters for are not Markdown metacharacters.

- **PART 9 §8: smart typography has a normative AST representation, and is
  unconditional by default.** A recognized substitution is a `smart_punctuation`
  inline node carrying both the resolved kind and the author's source run.
  Presentation renderers emit the glyph; the canonical writer emits the source
  run. Writing the glyph straight into the text buffer is no longer conformant.
  The eighteen kind names are spec surface; a quote node also records its
  resolved locale-dependent glyph; a dash run partitions into one node per glyph.
  A conformant implementation performs the substitution with no extension
  registered, and a locale/glyph extension selects which characters are emitted
  rather than whether the transform runs. Hosts may offer one document-global
  `smartTypography` switch (default `true`); per-target defaults are
  non-conformant. For profiles the node is classified as `text`.

- **PART 9 §8 admits source output on the Markdown target as a named optional
  feature** (`markdown-typography-source`). Read strictly, §8 made the glyph the
  only conformant Markdown output, so an implementation offering the setting was
  non-conformant. Per-render-call, Markdown only, changes no default. The other
  presentation targets MUST NOT offer it.

- **An optional `sections` switch on the HTML renderer.** Setting it to `false`
  renders headings flat, with the id back on the `<h*>` and the blocks that would
  have been section children left as siblings. HTML-only, since no other target
  emits `<section>` and the AST has no `section` node. No engine shipped it when
  this landed, so the optional-corpus case for it is visible as skipped.

- **The optional corpus can pin a target other than HTML.** A case's manifest
  entry may name a `target` - `markdown`, `plain` or `ansi` - paired with an
  expected file carrying that target's extension; an entry without one keeps its
  `NN-slug.html` pair, so all 29 existing cases are unchanged and a runner that
  predates targets needs no change. This closes a wider gap: **no corpus,
  mandatory or optional, pinned any target but HTML** - 498 mandatory and 29
  optional cases, all HTML, which is how two engines came to disagree about
  escaping intraword underscores with nothing failing. The first two
  Markdown-target cases ship with it (`30-symbol-map-markdown`,
  `31-markdown-typography-source`).

- **New corpus pins.** `19-smart-typography-dashes-and-quotes-9` pins all four
  quote/dash shapes, with expected output taken from the three engines, which
  agree byte for byte. `85-compact-list-blocks-2` pins §17 L2's compact sub-list
  rule with a following sibling - the variant was unpinned and carve-rs got it
  wrong, rendering the whole list loose.

### Changed

- **BREAKING: a `thematic_break` carries the marker the author wrote, and the
  writer reproduces it.** `---`, `***` and `___` are three spellings of one
  construct, and the tree kept none of them - so PART 11 §6, which leaves a
  spelling alone BECAUSE THE AST RECORDS IT, could not be applied to the break
  at all, and §6a pinned `---` as the interim answer. PART 12 §3 gives the node
  a `marker` field, absent for the default `-`, and §6a is removed with the pin
  it held. `***` now comes back as `***`, `___` as `___`, and a tree with no
  marker still writes `---` - so a converter's tree and every document written
  before the field get the spelling Carve teaches. The field carries the
  CHARACTER only: `***` and `*****` are one spelling, per the run-length ruling
  above.

- **BREAKING: `beforeRender` takes a read-only context, not the document alone.**
  The hook runs before the render starts, so a hook that produces output of its
  own had nothing to inherit and rendered with defaults: a table-of-contents
  entry and the heading it was cloned from disagreed whenever a render option
  (a `symbols` map, the raw-HTML policy) reached inline rendering. The context
  carries the render options, the effective mode for the target format, and
  whether the final target is HTML - the last so an extension emitting HTML in
  the hook can skip its transform on the Markdown, plain-text and ANSI targets
  and leave the source node for that renderer. It is READ-ONLY as a matter of
  contract: the guards run after the hooks, so a hook handed live options could
  clear the field a guard measures. The effective mode is `"interactive"` on
  every non-HTML target whatever the caller passed, which §2.5 now says in place
  of the claim that those renderers force `"static"` - no engine did that, and
  the same section already said `renderStatic` is the HTML path only.

- **PART 11 §6 no longer protects a fence's length.** The section named three
  author choices `fmt` must not respell, and its own argument backs two of them:
  a spelling is preserved because THE AST RECORDS IT, and `code_block` records
  no fence - neither its length nor its character. All three engines narrow a
  four-backtick fence to three, and all three widen a fence to clear a run in
  its content, so the round trip holds through both and the author's length is
  load-bearing nowhere. The example is removed rather than implemented. The same
  ruling answers the run-length question left open on the thematic break: the
  marker field tracked at carve#976 carries the CHARACTER only, so `***` and
  `*****` both come back as `***`.

- **NORMATIVITY: the executable artifacts are derived checkers, and decide
  nothing.** `resources/carve-core.ohm` and `scripts/spec/*.mjs` execute what
  `resources/grammar.ebnf` states so a contradiction inside it becomes visible;
  they are not a fourth implementation whose behavior the language follows. Three
  clauses state the consequences: a ruling cites a clause rather than a
  measurement, a golden is normative once committed rather than once generated,
  and a checker that disagrees with a committed golden is wrong until a clause
  says otherwise. Prose only: no production, no corpus document and no engine
  behavior moves.

- **PART 11 §1a: the round-trip invariant outranks the per-construct writer
  rules.** §1 says what `fmt` must achieve and §2 through §11 say how it spells
  each construct, and nothing said which wins. Six shapes were measured where a
  writer follows its own clause correctly and emits a document that re-parses as
  something else, three of them destroying the document outright. The invariant
  now governs: the per-construct rule yields, the test is on the EMITTED BYTES
  read back with the writer's own parser rather than on the source, a deviation
  taken to satisfy §1 is conformant and must not be corrected back, and the
  latitude reaches only the smallest departure that restores the invariant - it
  is not a license to respell. Stated over `parse(fmt(x)) == parse(x)`, which is
  what §1 requires; the HTML form is weaker and satisfying it alone is still a
  failure.

- **PART 11 §7b: a footnote definition with no blocks is written with the
  sentinel `{empty}`.** §1a's first application. A definition whose body holds no
  blocks - reachable whenever the body line is a block-attribute run, which the
  line consumes and discards - cannot be written back as a bare `[^f]:`, because
  that line is not a definition: the definition degrades to a paragraph and every
  reference to it degrades to literal text. The parse rule is UNCHANGED; what the
  clause pins is the writer's spelling, and it pins it in one place rather than
  leaving three engines to invent three sentinels. The non-obvious half is stated
  with it: the sentinel must be a valid attribute block, so `{ }` and `{}` - the
  two spellings a reader reaches for first - do NOT work, because a
  block-attribute line requires at least one attribute and both therefore stay
  literal text in the note's body. So does the consequence: `{empty}` is a
  BOOLEAN ATTRIBUTE and renders `empty=""` anywhere attributes survive; it is
  inert here because a footnote body is its own container and a block-attribute
  line with no following block inside it is dropped, which is a parse rule rather
  than a property of the word.

- **PART 7 assigns the whitespace terminals by ROLE, and pins their
  cardinality.** Twenty-five productions took the `space` terminal and a tab
  satisfied nine of them in the implementations, which split four ways on which.
  The whole ruling, in one place:

  - A **MARKER SEPARATOR** stands between a marker and the token that selects
    which construct the line opens. It is `space` and a tab never satisfies it.
    The colon fence joins the heading, list, task and definition markers here:
    `admonition_open`, `div_open`, `line_block_open` and
    `local_hard_break_block_open` share one separator slot.
  - A **PADDING SLOT** is whitespace between two tokens on a line whose construct
    is already fixed. It carries no recognition, so it is `whitespace` and admits
    a tab: the admonition opener's `"title"` and `[label]` slots,
    `frontmatter_open`'s slot before the format token, `link_title` at both
    sites, and the reference definition's slot before its trailing attributes.
    The code fence's slot before its info string joins them under the same
    discriminator, and `code_fence_info`'s `"header"` and `[label]` become
    `whitespace+`. `raw_block` keeps its `space`: the `=` after that slot selects
    a raw block over a code block, which is a separator's job.
  - **Cardinality: a padding slot spelled `space` admits exactly ONE space.**
    carve-js, carve-php, carve-rs and the executable spec all accepted a run at
    every one of them - four artifacts agreeing with each other and disagreeing
    with the written cardinality. So `[t](/u  "T")` is no longer a titled link,
    ` ```  php ` is no longer a fence opener, `---  yaml` is no longer a typed
    frontmatter opener, and `[a]: /u  {.c}` no longer carries the definition's
    attributes.
  - **Cardinality: a MARKER SEPARATOR is a run.** `footnote_definition` and
    `abbreviation_definition` said `space` while all four artifacts consumed a
    run; both now say `space+`. This is deliberately the OPPOSITE answer from the
    padding slots, because the two govern different positions. The run is ASCII
    spaces, so the first character that is not one BEGINS the content:
    `*[HTML]: <NBSP>Hyper` expands to a title starting with the no-break space.
  - **The INLINE attribute block's interior is space-only; the block-attribute
    LINE is not.** All five inline slots sit after the first non-whitespace
    character of their line, where a tab is not syntax. The block-attribute line
    keeps `whitespace` at its three slots - it is the one construct whose
    interior can hold a leading indentation run - so the distinction is
    positional rather than per-construct.
  - **A quoted attribute value stops at the newline.** `quoted_value` built its
    value out of `character`, so a line break inside the quotes was content - the
    one remaining way an INLINE attribute block could span lines. The block form
    reads the same production, so a break inside a quoted value ends that block
    too. A block attribute may still span lines: a `continuation` sits between
    two tokens, never inside one.

  **Cost, recorded:** corpus 252, 252-2 and 252-3 asserted the tab forms and all
  three engines produce them; they are rewritten to the narrowed answer rather
  than deleted, so the shapes stay pinned as literal output. Corpus 262 through
  265 and 267 carry the cardinality rulings, each with its one-space or
  one-tab CONTROL. Zero of the 737 documents that existed before the padding
  ruling carried a two-space run at any of the five sites.

- **A reference definition is anchored at end of line.** `reference_definition`
  ends in `newline`, and always did, but all three engines and the executable
  spec read `[a]: /u zzz` as a definition with trailing junk. Nothing in the
  grammar authorized that reading; the line is now an ordinary paragraph, and a
  reference below it does not resolve. This makes PART 7's promised failure mode
  reachable at this line for the first time - the clause says a slot that fails
  to match falls back to prose rather than silently dropping metadata, and the
  tail had been eating whatever a failed slot rejected. So `[a]: /u<TAB>"T"`,
  `[a]: /u<SP><TAB>{.c}` and the four other spellings are paragraphs too.

  The line ending is `whitespace`, so `[a]: /u<SP>` is still a definition and
  `[a]: /u<NBSP>` is not. A trailing zero-width character does NOT defeat the
  definition: the anchor only sees what is left over after the production, and
  U+FEFF is not `White_Space`, so `link_destination` absorbs it as an ordinary
  `unicode_url_char` and the character lands in the href. The format-character
  exclusion is attributed to `url_char` - the autolink body - where it lives.

  **Cost, recorded:** a shape all four artifacts accepted stops being a
  definition, and corpus `16-reference-link-5` pinned `[r]: a b c` resolving to
  `a`; its golden moved. Corpus 266 carries the ruling.

- **PART 3: an autolink body admits non-ASCII and excludes format characters.**
  `url_char` was an enumerated ASCII set, so read as written an autolink admitted
  no non-ASCII at all. Outside ASCII it now admits any character that is not
  whitespace, not General_Category Cf and not a control character. The deciding
  argument is the asymmetry with the inline form: `[t](https://<IDN>/)` links in
  all three engines today. The format-character exclusion is the half that is new
  rather than permissive - an invisible character in a host is a spoofing
  surface. `link_destination` and `scheme` are unchanged. No implementation had
  both halves.

- **Trailing whitespace on a content line is dropped.** PART 2's rule was written
  down only for a paragraph's FINAL line, and PART 12 §7 asserted the OPPOSITE
  for a line before a SOFT BREAK - claiming `a` + SPACE + newline + `b` renders
  `<p>a \nb</p>` and arguing from that claim that a formatter must not strip it.
  It does not render that way. The clause is now general and the contradiction is
  corrected: the run is dropped on a paragraph line, a heading, a list item, a
  block quote line, a definition term or description, a footnote body line, a
  table caption and a line-block line.

  The run is `whitespace` - a space or a tab. Every other character is content
  and survives, however invisible. Verbatim payloads keep their bytes, and
  whitespace INSIDE a construct is not trailing. A line block's MEDIAL GAPS rule
  converts a run of two or more columns into NBSP content before this rule is
  reached, so only its one-column case is dropped. Corpus 268 carries it.

- **A lazy continuation needs an OPEN PARAGRAPH, and the container kind is not a
  parameter.** S4 already said a line folds only where some container holds an
  open paragraph. Five shapes are now decided by that one sentence rather than by
  the container's kind:

  - A list item whose last block is a container: `. >` followed by a column-0 `X`
    closes the item, because the quote is empty and nothing is open. `- > q` /
    `lazy` still folds.
  - A block quote answers the same way: `> quote` / `> ::: note` / `tail` closes
    the quote and leaves `tail` at top level, because the div the quoted line
    opened is empty. The CLOSED form decides the same way.
  - An unterminated `::: ` div differs by one line of body: a div holding a
    paragraph has one open, so the flush-left line folds into it; an empty div
    has none. Terminating the div inverts the first answer.
  - §12's absorption is bounded by whose line it is. A flush-left `:::` under a
    quoted paragraph supplies no `>` prefix, so the strict column-0 rule decides
    it, the quote closes, and the line opens a div of its own. The QUOTED
    `> :::` twin is still absorbed, and the two are pinned side by side.
  - An ABSORBED colon fence leaves the item's paragraph open. `:::note` fails the
    opener test since a type word wants a separator, so the line is ordinary
    paragraph text and §12 has the paragraph absorb the trailing fence as text
    too. **Corpus `86-list-lazy-continuation-9` moves**: `tail` goes from a
    document paragraph into the item's.

  A definition body's continuation indented PAST its column is lazy text, for the
  same reason: `definition_indent` REACHES the body's column and does not measure
  how far past it a line went. The rejected reading would make indentation depth
  mean two different things one line apart.

- **PART 9 §17 L3: a `+`-attached block ends at its fence closer, not at a blank
  line inside it** (carve#982). L3 bounds the attachment "up to the next blank
  line, sibling marker, or a further `+`", and those bound THE BLOCK - a fenced
  block ends at its closer, which is what makes it one block, so a boundary line
  written between an opener and its closer is fence content and ends nothing. No
  production changes; the reading was already the clause's, and is now stated.
  The corpus pins it as
  `279-a-boundary-line-inside-an-open-fence-does-not-end-the-container-7`, the
  list `+` collector being the largest severing group of the class. All three
  engines are knowingly behind that row, declared in
  `resources/engine-pin-drift.txt`; the six rows already in the category are
  byte-identical everywhere.

- **PART 9 §17 L1: a blank line inside an item's own indented comment or colon
  fence does not loosen the item** (carve#985). L1 loosens on a blank-line-
  separated second PARAGRAPH. Inside a comment fence there is no paragraph at
  all - §28 makes that body verbatim AND invisible, and L1b says a line
  rendering nothing "cannot BE the second one". Inside a colon fence the blank
  separates two paragraphs of the DIV, and the div is ONE block, so the item has
  no second paragraph either. Four corpus rows land in
  `279-a-boundary-line-inside-an-open-fence-does-not-end-the-container`: the two
  above, each beside the same item with the blank moved past the closer, where
  the item IS loose. The two that pin a defect are declared in
  `resources/engine-pin-drift.txt`; the two loose ones reproduce in the pinned
  build already, which is what makes them controls rather than coverage.

- **PART 9 §4: the one-blank-line caption allowance is pinned on every host**
  (carve#991). §4 gives one rule for all five captionable hosts - adjacent OR
  exactly one blank line attaches - but the corpus held exactly ONE document
  separating a host from its caption with a blank line, and it was a blockquote,
  one of the three hosts whose production already ends in `[caption_slot]`. The
  allowance was unpinned for the table, the fenced code block, the image
  paragraph and display math, and for the last two it is PROSE rather than
  structural, so nothing held it at all. A reader could have dropped the
  blank-line form on four of five hosts and stayed green. New category
  `281-a-caption-attaches-across-one-blank-line` pins the four, each preceded by
  the same document with the blank line removed, which must render identically.
  No behavior changes; every one of the eight is what the engines already do.

- **PART 9 §4: where the caption allowance STOPS is pinned on every host**
  (carve#997). The clause has two halves - at most one blank line attaches, and
  anything wider does not - and only the first was held by a document. Widening
  `caption_slot` from `[blank_line], caption` to `{blank_line}, caption`, so that
  any number of blank lines attaches, broke NOTHING in 856 documents: every
  captioned document in the corpus had zero or one blank line, so not one of them
  could tell "at most one" apart from "any number". New category
  `282-two-blank-lines-detach-a-caption`, ten documents in five pairs, one pair
  per captionable host. Each two-blank-line row pins the host UNCAPTIONED and the
  `^ ` line as an ordinary paragraph, and is preceded by the same document with
  one blank line, which attaches; without that control a row would be equally
  satisfied by a reader that stopped attaching captions across a blank line at
  all. The widening now breaks five documents where it broke none. No behavior
  changes; carve-js, carve-php and carve-rs produce all ten of these outputs
  today.

- **PART 9 §17 L1a: a list item's first block does not decide loose or tight.**
  L1 asks whether the item holds a blank-line-separated second paragraph, not
  what its first block was. `- - a` followed by a blank line and `Body.` is
  LOOSE, like every other lead. The sub-list lead was the one shape where the
  engines split.

- **PART 9 §15: a floating attribute skips what renders nothing.** `{…}` on its
  own line attaches to the next VISIBLE block: a reference, footnote or
  abbreviation definition, and a comment, do not count. Attaching an attribute to
  a construct that emits nothing discards it silently, and A4 already reserves
  discarding for end of document. Three engines answered three ways and none was
  self-consistent across the five invisible kinds.

- **PART 9 §15 A3: a repeated class collapses.** The merge said "ALL classes
  accumulate in source order, NO de-duplication ... matching djot and carve-php",
  and no implementation did that - the clause named as its witness the engine
  that contradicts it. Accumulating is about the LISTS: a later block adds its
  classes rather than replacing the earlier block's, and a class already present
  is not added twice. The worked example had no repeated class, which is why it
  read the same either way.

- **PART 10 §4 states the empty-container body shape.** A container whose body
  renders nothing keeps a blank line where the body would be, except a bare `:::`
  div, which closes on the next line. The exception has no principle behind it
  and the clause says so - it stands because all three engines already produce it
  and the corpus already pins it. What was genuinely unspecified is narrower: a
  div with a WORD CLASS, which is exactly where carve-php diverged.

- **PART 10 §1 says where a generated attribute goes, and where a render
  annotation goes.** The author's own attributes keep their source order and
  anything the engine minted follows them: `<h1 a="b" class="c" id="Auto">` for
  an auto slug, `<h1 id="x" a="b">` for an id the author wrote. Provenance is the
  discriminator, not the attribute's name. A render annotation is a third
  category and is emitted last of all - `<h2 id="Nested" data-source-line="1">` -
  because `data-source-line` records where a block was written rather than
  describing the element. All three engines disagreed on the first, with nothing
  able to catch it: the combination was reachable only through a heading inside a
  container, and no corpus case gave such a heading attributes. carve-js is
  canonical.

- **PART 9 §13 says where non-id heading attributes go, and what containers do.**
  Two rules every engine already implemented and the spec never stated. On a
  top-level heading the id hoists to the `<section>` and every other attribute
  stays on the `<h*>`, identically for a slugged and a written id. A heading
  inside a blockquote, div, admonition or list item is not wrapped at all: it
  emits `<h* id="…">` in place, still slugged, still sharing the one dedup
  namespace, still a `</#id>` target. Djot resolved the first question the other
  way and then implemented that only when an explicit id is present, so its two
  id cases contradict each other and its own stated rule (`jgm/djot.js#144`).

- **PART 11 R1 describes the implicit heading fallback it always had.** A
  `[text][]` that matches no link definition resolves against the document's
  headings by their rendered text. The rule was documented in prose and
  implemented in every engine, but the resolution pass never mentioned it -
  including the parts a second implementation cannot guess: link definitions win
  a tie, matching folds case and collapses whitespace (unlike the exact,
  case-sensitive link-definition matching in the same rule), and a heading with a
  blockquote ancestor is declined in either nesting order.

- **PART 11 §10a: an unused definition survives the non-HTML targets, and the
  clause is narrowed to the kinds that have a node.** A footnote or abbreviation
  definition nothing references is still emitted by the Markdown, plain-text and
  terminal renderers, with its marker as written; HTML still drops it. The LINK
  half was unimplementable in any engine - a link reference definition leaves NO
  node in the tree, and PART 12 §3a had already considered adding that node and
  declined it, so one section was requiring what another's recorded decision made
  unreachable. The gap the narrowing leaves is stated rather than hidden: an
  unused link definition survives nothing today, so `carve --markdown` loses the
  URL.

- **PART 9 §25: at the render ceiling, a renderer refuses.** §25 gave every
  renderer a ceiling above the parse cap and did not say what happens AT it, so
  eight of nine renderers across the three engines truncate silently and one had
  no ceiling at all. Reaching the ceiling now MUST produce a typed, documented
  failure naming the bound - the same rule PART 12 §9(b) already applies to
  ingest. It costs nothing on any path a document travels: the ceiling exceeds
  `MAX_NESTING_DEPTH` by construction. One of the silent renderers is the
  canonical writer, so a tree built through the API and formatted came back with
  its body gone and nothing in the return value to say so.

- **PART 9 §25: a flattened over-cap opener is ordinary paragraph text.** §25
  said an opener past `MAX_NESTING_DEPTH` "becomes literal paragraph text" and
  did not say how consecutive ones GROUP, so the three engines produced three
  byte-different outputs and all three satisfied the sentence. They now group by
  the ordinary paragraph rule - one paragraph, ending at the first blank line, no
  trailing newline before `</p>`.

- **PART 9 §8: accepting `smartTypography` and ignoring it is not conformant.**
  The switch was already normative where offered, and a host that omits it stays
  conformant - but accepting `smartTypography: false` and emitting the glyphs
  anyway tells the caller the document is configured when it is not. Omitting and
  implementing are both fine; the silent middle is forbidden.

### Fixed

- **A `^ ` caption line does not end a paragraph it cannot caption**
  (markup-carve/carve#1046, new §10 I7). A caret line is in neither §10 I1 nor
  §10 I5, so it never interrupts an open paragraph on its own; §4 is what ends
  one at a caret, and only for the five captionable hosts. The executable spec
  ended the paragraph on EVERY caret line and opened a second one, where all
  three engines fold the line in. Only the indented spelling was in the corpus,
  where both readings agree, so the divergence stayed invisible until the
  canonical writer stopped force-escaping a line-initial caret.

- **Adjacent mergeable blocks in a tight attached run stay separate.** The
  canonical writer retains `+` from the first sequence boundary that would
  otherwise collapse two blocks, without changing isolated block openers.

- **Canonical formatting preserves ragged table rows.** A writer emits exactly
  the cells each row carries instead of padding short rows to the widest row;
  when a header delimiter is needed, its width comes from the header row.

- **The executable spec slugs a heading id from its RENDERED text, not its
  source** (markup-carve/carve#1011, syntax.md §4.1 step 1). The oracle took the
  heading's source with `</#id>` runs deleted, which reaches the right answer for
  most headings by accident - the slug replaces each run of non-alphanumeric
  ASCII with a `-`, so `*`, `` ` `` and `/` fall out on their own. What a source
  string cannot do is tell a delimiter from content: `# a [x](/y) b` slugged as
  `a-x-y-b`, carrying a link DESTINATION into the id, and `# a :smile: b` slugged
  as `a-smile-b`, carrying a shortcode name the rendered document need not print
  at all. Step 1 excludes both already. The derivation now runs over the rendered
  inline output with the PART 9R sentinels and the symbols removed, so it needs
  no list of delimiters, and reverses smart typography to ASCII the way step 1
  says (`# it's a heading` stays `it-s-a-heading`).

  The IMPLICIT-REFERENCE INDEX takes the same derivation, on both sides. It is
  keyed by the same rendered plain text, so a heading that excludes the shortcode
  from its id is keyed `a b` and reachable by that spelling: keying the id one
  way and the index the other left `# a :smile: b` reachable by
  `[a :smile: b][]` and not by `[a b][]`, where all three engines resolve both.
  Corpus rows added for every shape (PART 9R R1's section grew from three
  documents to eleven).

- **Restored nine regions of `resources/grammar.ebnf` that a stale-copy merge
  removed.** markup-carve/carve#525 rewrote the grammar from an out-of-date
  working copy; its merge-base was current, so git recorded ordinary deletions
  and merged with no conflict. Four normative clauses left the file while the
  docs, the AST schema and this changelog went on citing them: PART 12 §3a, PART
  12 §7's extension to every definition kind, PART 12 §1a's "the merge is part of
  `parse(x)`", and MARKER REQUIRES CONTENT's extension to `::`. Five further
  regions reverted to superseded text. An implementer who read the grammar in
  that window read the wrong document.

  Guarded, so the class fails a test rather than surviving a merge:
  `resources/normative-clauses.txt` names every clause carrying the
  `-- NORMATIVE` marker, and every `PART 12 §N` citation in the docs, the schema
  and this file must resolve to a real section. Removing a clause stays allowed;
  removing it silently does not.

## [0.1.1] - 2026-07-27

### Fixed

- The executable-spec oracle's hyphen-run smart typography now uses the canonical
  allocateDashes decomposition (all em when divisible by 3, all en when even,
  otherwise the most em-dashes with the remainder as en, trading one em-dash for
  two en-dashes when the remainder is 1). It previously emitted a single em-dash
  for every odd non-multiple-of-3 run, diverging from carve-js and carve-php at
  runs of 11 and 13 hyphens.

- The executable-spec oracle now applies the lenient definition-list rule (PART 9
  §24 C3): a `:  def` line attaches as a `<dd>` to its open `:: term` at or below
  the term's column (even under the item content column), and an over-indented
  definition folds into the term while preserving its whitespace. Aligns the
  oracle with carve-js / carve-php / carve-rs across the definition-column family.

- Static diagram output now uses a uniform wrapper across engines: a supplied
  renderer's output is wrapped in a `<div class="{cssClass}">` carrying the
  fence's merged attributes. Previously carve-js emitted `<pre>`, carve-php a
  `<div>`, and carve-rs bare output that dropped the css class (carve#302).

### Added

- **Corpus pins for three converged edge cases** confirmed across carve-js,
  carve-php, carve-rs and the oracle: a longer hyphen-run ladder (7, 8, 10, 11,
  13) extending the smart-typography dashes example so the allocation is pinned
  with no leftover literal hyphen; an unresolved `[^a]` footnote reference with a
  trailing `{...}` attribute stays literal text and does not become an attributed
  span (161); and a tight list item keeps trailing text after a closed block (a
  fenced code block, div, or admonition) bare, wrapping it in a `<p>` only when a
  blank line makes the item loose (162).

- **Corpus pins for the strict column-0 rule and one list-looseness fix** now
  confirmed converged across carve-js, carve-php, carve-rs and the oracle
  (155-160). A top-level block opener only fires at column 0: indented by even a
  single space it stays literal paragraph text. Pinned across the construct
  families - an indented attribute line before a paragraph or list (155), an
  indented image with a `^ ` caption, alone or under an indented attribute brace
  (156), an indented reference-link or footnote definition, which then registers
  nothing (157), and an indented `:::` div, `::: |` line block, or `::: note`
  admonition (158). Each of 155, 156, and 158 also pins a flush-left control
  proving the column-0 form still fires (attribute attaches, figure forms, div
  opens). Inside a list item the openers key on the content column: a `::: note`
  whose body sits below it folds as literal text (159). Finally, an outer list
  item carrying its own internal blank before a block attached under its nested
  list is loose, wrapping its lead text in a `<p>` (160, the list-looseness fix).
- **Corpus pin for a newly-aligned definition-term wrapping behavior** (154). A
  `:: term` continued by a wrapped line that sits below the item content column
  is a lazy continuation, so its leading whitespace is stripped before it folds
  into the `<dt>` - matching a lazy paragraph continuation. carve-js previously
  kept the stray space; it now strips (carve-js#385), so all four producers
  (carve-js, carve-php, carve-rs, oracle) agree byte-for-byte. The pin covers
  continuation columns 0 and 1.
- **Corpus pins for five previously unpinned cross-engine behaviors** now
  confirmed converged across carve-js, carve-php, carve-rs and the oracle: a
  block opener dedented below an indented marker's content column folds as lazy
  text (149); a leading unattached `{…}` brace before an inline span stays
  literal (150); a `{…}` after an inert mention/tag stays literal (151); the
  lenient definition-list rule where a `:  def` attaches at or below the term's
  column and folds only when over-indented (152); and the image trailing-attribute
  glue rule where a spaced `{…}` stays literal while a glued one attaches (153).
- **Protection for byte-exact corpus fixtures.** Several pairs assert the
  handling of characters an editor or formatter would "clean up": a trailing
  no-break space, a trailing ASCII space, and the zero-width / bidi controls in
  the Trojan-Source pairs. An `.editorconfig` and `.gitattributes` now stop
  those bytes being normalized away, and a `tests/fixture-bytes.test.mjs` guard
  fails loudly if one goes missing. The guard is not redundant with the corpus
  test: where the same invisible character appears raw on BOTH sides of a pair
  (the Trojan-Source zero-width case), stripping it from both keeps them in
  sync, so the corpus test stays green while no longer testing anything.
- **Corpus coverage for trailing-whitespace boundaries.** The trailing-whitespace
  strip applies to the paragraph's SOURCE line, so it never touches spaces a
  construct produces while rendering: a paragraph whose entire content is an
  all-space verbatim span keeps them. The existing all-space pairs only covered
  the mid-sentence form, so the lone case - the one that actually diverged
  between implementations - was unpinned. A trailing no-break space is likewise
  pinned as content, not whitespace; only ASCII whitespace is stripped.
- **Corpus coverage for all-space verbatim content.** The single-space strip on
  a verbatim span drops one leading and one trailing space, but not when the
  content is entirely spaces - those spans keep every space. No corpus pair
  exercised this, which is why a formatter round-trip bug (spans growing by two
  spaces per pass, and all-space content collapsing to an unwritable empty span)
  shipped in all three engines undetected. Pinned for code spans, the inline
  literal and math.
- **Inline literal** (`` !`…` ``, PART 9 §27): a `!` prefix on a verbatim code
  span, mirroring the `$`-math prefix. Content is captured verbatim and
  HTML-escaped, emitted by every renderer, but rendered as prose with the
  `<code>` wrapper dropped - so notation that collides with the bare emphasis
  delimiters (phonemic `/kaet/`, glob patterns, paths) needs no per-character
  escaping. A trailing `{…}` is the ordinary inline attribute block. Chosen
  over the earlier trailing-`{!}` sigil for family fit with math and image
  (carve#280).
- Diagram documentation: a dedicated Diagrams & Charts page and a cheatsheet
  section covering the `FencedRender` presets, which were previously described
  only in capability tables.
- **PlantUML preset** (`plantuml`, claims `plantuml` and `puml`), covering the
  UML diagram types Mermaid does not (use case, component, deployment, timing),
  renderable client-side offline via `@plantuml/core`.
- `plantuml` added to the static-render **renderers** key set, so a build-time
  PlantUML renderer can bake diagrams into no-JS static HTML.
- **Open static renderers map.** The `renderers` map is now keyed by the fence's
  css class rather than a closed canonical set, so a custom `FencedRender` fence
  word (`fencedRender({ language: 'myuml' })` + `renderers: { myuml: … }`) is
  static-capable in every engine with the same config - no spec edit, no
  lockstep. Canonical presets are just the pre-named classes. This supersedes
  the closed-key-set design.
- **SVG `img` fence** (Tier-3, off by default): a `` ```img `` block renders a
  sanitized SVG, sandboxed by default (a `data:image/svg+xml` `<img>`), with an
  opt-in inline mode for theming (#311).

First normative grammar and corpus snapshot. This release locks the Carve
specification at its initial stable version: the grammar (`resources/grammar.ebnf`),
the conformance corpus (`tests/corpus`), and the optional extension corpus
(`tests/corpus-optional`) are all considered normative from this point.
All four core implementations (carve-js, carve-rs, carve-php, carve spec)
advance to `0.1.0` together as the first lockstep minor release.

### Added

#### Tier-1 core (always-on, corpus-pinned)

- **Inline emphasis** - `/italic/`, `*bold*`, `_underline_`, `~strikethrough~`,
  `=highlight=`, `/*bold italic*/`; strict word-boundary rules (no intraword bare
  delimiters); doubled delimiter is always literal; forced `{X...X}` family for
  deliberate intraword emphasis
- **Superscript and subscript** - braced-only `{^text^}` / `{,text,}`. There is no
  bare `^text^` / `,text,` form: sub/sup attach to characters, not words, so the
  dominant uses (`H{,2,}O`, `mc{^2^}`) are intraword, which a word-boundary bare
  delimiter could never express - and a bare comma or caret collides with prose
  punctuation. The bare emphasis delimiter set is therefore `/ * _ ~ =`.
- **Headings** - `#` through `######`; each heading wrapped in a
  `<section id="...">` element; heading ids are Unicode-preserving and
  case-preserving by default, with opt-in lowercase and ASCII-fold transforms
- **Links and images** - `[text](url)`, `![alt](url)`, wiki-style `[Page Name][]`
  (auto-resolves to a heading without a separate definition),
  `<url>` autolinks, `<mailto:>` autolinks
- **Cross-references** - `</#id>` auto-fills its link text from the target
  heading; numbered cross-references with `#` placeholder in captions
  (e.g. `^ Figure #: ...`) auto-number figures, tables, listings, and equations;
  `</#id>` to a numbered caption fills in "Figure 1" etc.
- **Lists** - unordered (`-` or `*`), ordered (decimal/alpha/roman with `.` or
  `)` delimiter), task lists (`- [ ]` / `- [x]`); list continuation marker (`+`
  on its own line) attaches the next flush-left block to the current item;
  list-item attributes
- **Definition lists** - `:: term` / `:  definition` two-character prefix
- **Tables** - `|=` header prefix (no separator row required), headerless tables,
  per-column alignment (`|=<` left, `|=>` right, `|=~` center), per-cell
  alignment; `^` rowspan marker, `<` colspan marker, `+` multi-line cell
  continuation; `^ caption` for table captions; GFM `|---|` delimiter row
  accepted as an alternative header marker
- **Fenced and inline code** - `` `inline` ``, ` ``` lang ` fenced blocks;
  code callout markers (`<n>`) in fenced code with a bound explanation list
  (Tier-2 when enabled)
- **Blockquotes** - `>` prefix; `^ Attribution` caption
- **Footnotes** - `[^id]` reference, `[^id]: definition` definition block,
  inline `^[...]` footnote
- **Math** - `` $`...` `` inline math, `` $$`...` `` display math (djot form)
- **Admonitions** - `::: type` two-tier fenced divs: eight canonical types
  (`note`, `tip`, `info`, `warning`, `danger`, `success`, `example`, `quote`)
  render to `<aside class="admonition type">`; any other type word renders to a
  generic `<div class="type">`
- **Generic divs and spans** - bare `:::` / `::: {attrs}` for plain `<div>`;
  `[text]{attrs}` inline span; `:::` nesting with matching closer length rule
- **Attributes** - `{#id .class key=value}` on any block or inline element;
  boolean attributes `{disabled}` (renders as `name=""`); strict identifier
  rule (digit-first or non-identifier chars make the whole block literal)
- **Editorial / critic markup** - `{+ +}` insert, `{- -}` delete,
  `{~ old~>new ~}` substitute, `{= =}` highlight, `{# #}` comment
- **Frontmatter** - YAML frontmatter block at document start; safe loader
  (no arbitrary object instantiation)
- **Comments** - `%%` whole-line, `text %% trailing`, `%%%` block comment
- **Raw blocks and inline** - ` ```=format ` raw block, `` `code`{=format} ``
  raw inline; safe-passthrough mode required for untrusted input
- **Abbreviations** - `*[ABBR]: expansion` for automatic `<abbr>` tags
- **Smart typography** - straight quotes to curly quotes, `--` en-dash,
  `---` em-dash, `...` ellipsis; locale-aware quote sets (Tier-2 when configured)
- **Mentions, tags and symbols** - `@user` mention, `#tag` tag, `:name:` symbol;
  all three share one left-boundary rule (open only at start of line or after
  whitespace or an opening punctuation character) and render as non-link spans by
  default. Symbol names allow `+` / `-` as the first character; unmapped symbols
  render literally. URL templates (mention/tag) and the symbol map are Tier-2
  configuration over this Tier-1 syntax.
- **Extension syntax** - `:name[content]{attrs}` inline extension,
  `::: name` block extension; unknown words fall through to generic
  `<span>` / `<div class="name">` without error
- **Captions and figures** - `^` prefix line attaches captions to images,
  blockquotes, tables, fenced code blocks, and display math; captioned blocks
  are wrapped in `<figure>` with `<figcaption>`
- **Thematic breaks** - `---` / `***` / `___`
- **Hard line breaks** - end-of-line `\` (visible, no trailing-space tricks)
- **Tab indentation** - tab-stop-aware list nesting (4-space tab stops)
- **Paragraph interruption** - a block opener on a new line starts a block
  without requiring a blank line (Markdown-style; stricter than Djot)
- **Target-aware rendering** - one parsed document can be emitted to HTML,
  ANSI terminal, Markdown, or plain text by swapping the renderer

#### Tier-2 standard extensions (off by default, corpus-pinned when enabled)

- **Citations** - `[@key]` inline citation with typed locators
  (`[@key, p. 12]`) and integral markers (`[@key]!`); resolved against a
  CSL-JSON bibliography source named in frontmatter
- **Code callouts** - `<n>` markers inside fenced code blocks bound to an
  explanation list below the block
- **Bibliography** - supplying a CSL-JSON pool to the citations extension
  renders a cite-ordered reference list with mandated numeric output and
  back-links (no separate block construct; driven by the citations pool)
- **Glossary** - `::: glossary` definition list whose terms become
  `<dt id="gloss-{slug}">` entries; `:term[word]` inline links to the entry
- **Index** - invisible `:index[term]` markers collected into a sorted
  `::: index` block with back-links to every occurrence
- **Heading numbers** - opt-in section auto-numbering (`<span class="section-number">`)
  on each heading; numbered `</#id>` cross-references rewritten to "Section 1.2 - Title"
- **Mention / tag URL templates** - configurable URL templates for `@mention`
  and `#tag` routing
- **Symbol map** - `:name:` symbol to replacement mapping (e.g. an emoji glyph
  map); a symbol carrying attributes renders as a `<span>`
- **Locale smart-quote sets** - per-locale opening/closing quote pairs
- **Bare-URL autolinking** - plain URLs in prose auto-linked without angle brackets

#### Security model (normative, always enforced - grammar PART 9)

- **URL-scheme denylist (§25)** - `javascript:`, `vbscript:`, `data:`, `file:`,
  and OS protocol-handler schemes (`ms-msdt`, `ms-office`, `shell`, `vscode`,
  and related) blanked on all link/image/autolink sinks; scheme detection strips
  leading ASCII control characters and all Unicode whitespace before matching
- **Attribute hardening (§25)** - `on*` event-handler attributes and `srcdoc` /
  `formaction` dropped on every rendered element; `javascript:`/`vbscript:`/
  `data:`/`file:` values in any attribute blanked; `style` values containing
  `expression(`, `url(`, `@import`, `behavior:`, or `-moz-binding` blanked
- **Safe raw passthrough (§25)** - implementations must provide a mode where raw
  blocks and raw inline emit as escaped literal text rather than verbatim HTML
- **Resource bounds / DoS protection (§25)** - parse and render must be linear
  in input size; MAX_NESTING_DEPTH = 200 cap applied uniformly to all container
  kinds; abbreviation, reference, footnote, and crossref expansion bounded to
  O(n) total work
- **Non-HTML injection prevention (§25)** - Markdown, plain-text, and ANSI
  renderers must strip control characters from text/code/math/URL values before
  emission
- **Trojan-Source / invisible-Unicode hardening (§26)** - heading ids NFC-normalized
  and stripped of bidi-override/isolate controls (U+202A-U+202E, U+2066-U+2069)
  and zero-width characters before slugging; rendered text and code-span/code-block
  content strip bidi-override/isolate controls (removed, not entity-escaped, to
  prevent round-trip reintroduction)

[0.1.0]: https://github.com/markup-carve/carve/releases/tag/0.1.0
