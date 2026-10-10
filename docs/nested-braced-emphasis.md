---
title: "Explicit same-kind emphasis nesting"
description: "Specification change, compatibility examples, and acceptance cases for nested braced emphasis."
---

# Explicit same-kind emphasis nesting

This specification change permits an explicit braced emphasis child of an active kind. It covers strong, italic, underline, strike, highlight, superscript, and subscript. It is governed by CARVE-P9-043 and the delimiter-stack rules in PART 9 §9.

## Implementation status

This PR changes the specification and supplies shared acceptance vectors. It does not change JavaScript, PHP, Rust, the formal reference parser, or editor grammar implementations. The published engine pin and existing executable corpus remain unchanged. Their old same-kind expectations, including corpus 471, describe the current implementation during this draft review; they are not acceptance evidence for the new rule.

Before this change is released, update the affected corpus expectations and declare any specification-ahead engine drift, implement the rule across all three engines and the formal reference parser, then verify the updated corpus. The shared vectors in `resources/spec/nested-braced-emphasis-cases.json` are the expected new behavior, not results measured against current engines.

## Native spelling

~~~carve
{*outer {*inner*} tail*}
*outer {*inner*} tail*
{^outer {^inner^} tail^}
~~~

The first two examples each produce a strong parent with a strong child. The third produces two superscript nodes. A bare child of an active kind remains literal, so `{*a *b* c*}` is one strong node with inner asterisks in its text. Doubled bare delimiters such as `**x**` remain literal.

A right-to-left stack pass records braced pairs. An unmatched opener changes nothing. A matched opener selects its nearest available closer of the same kind and discards any intervening closers, which lie inside that matched frame. Discarded closers cannot pair with braced ancestors, but their bare mark still follows the ordinary delimiter rules inside the matched child. Per-kind stack heads avoid rescanning. Forward resolution uses only those indexed pairs as opaque boundaries. Each paired explicit closer ends its matching braced span. It cannot cross an intervening braced boundary or a bracket-run boundary. Code, literal and raw spans, comments, destinations, and attributes retain their existing opacity. Empty braced spans remain literal. Only matched braced spans create an opaque boundary. For `*a {*b c*`, the unmatched child opener remains literal and the bare parent closes normally. An unmatched outer opener does not discard a matched inner span: `{*a {*b*}` keeps the outer opener as text and the inner strong node.

Child and parent attributes attach independently:

~~~carve
{*a {*b*}{.inner} c*}{.outer}
~~~

Strike substitution uses a separator visible in its own braced frame. A matched nested braced span hides its separators; an unmatched opener hides none. Each nested strike/substitution frame is classified independently. This clarifies a previously incomplete boundary rule and changes some existing substitution input, as shown below. Editorial insertion and deletion retain their meanings.

## Compatibility

Existing source containing nested explicit spans can change meaning, including adjacent same-kind children and strike children inside substitution. Unmatched and crossing candidates can change recovery too; the shared cases record the proposed results. For example, the pinned implementation reads `*a {*b*} c*` as one strong span ending after `b`, followed by literal text. The new rule produces a strong parent containing a strong child and the trailing ` c`.

The measured pinned output for `*a {*b*} c*` is `<p><strong>a {*b</strong>} c*</p>`. Two further compatibility cases matter:

- `{*a {*b c*}` now leaves the outer opener literal and closes the inner strong span. Previously the outer strong contained literal `{*b c`.
- `{~a {*x~>y*} b~}` now produces strike containing a strong child whose text is `x~>y`. Previously the pinned implementation produced deletion and insertion around the separator. This is an explicit substitution-boundary change within the proposal.

An author who wants literal punctuation can escape it:

~~~carve
\{\*x\*\}
~~~

Escaping only the opening brace prevents a forced opener, but other punctuation can still participate in ordinary inline parsing. A canonical writer must escape all active punctuation needed to preserve literal text.

## Writing, import, and export

The native writer must preserve repeated emphasis nodes and their attributes. Canonically, every emphasis node with an ancestor or descendant of its own kind uses braces, even across intervening emphasis kinds. Both bare-parent and braced-parent strong examples therefore write as `{*outer {*inner*} tail*}`. Unrelated nodes keep their existing spelling rules. Importers must preserve newly representable relationships and stop reporting same-kind flattening for those relationships. If changing a child from braced to bare would expose a literal `~>` inside an emitted forced strike, escape the tilde as `\~>` so the parent cannot become substitution. Other unsupported shapes and depth-limit recovery keep their diagnostics.

HTML keeps both wrappers. Plain output keeps the text. Markdown and Djot export retain their existing target-specific contracts: native support does not prove that either foreign syntax can preserve every nested tree. Verify those targets separately and use their specified fallback or loss reporting where needed.

The definitions in [`resources/ast-schema.json`](https://github.com/markup-carve/carve/blob/main/resources/ast-schema.json) already permit inline children of these kinds, including children of the same kind. This change needs no new node or field and no schema-version bump for that relationship.

## Acceptance

The 69 shared vectors cover all seven kinds, bare parents, three levels, repeated ancestors, independent attributes, opacity, malformed and crossing input, literal controls, document hosts, and depth budgets. Document vectors use the published interchange schema, including footnote definition nodes, rather than JavaScript runtime-only root fields. Each vector's `children` is the expected paragraph inline run. Direct parsing checks the proposed node structure. For canonical write/reparse equality, normalize `escaped_text` to text and coalesce adjacent text runs: escaping needed by the writer can change those source classifications without changing content. Preserve emphasis kinds, child order, text values, and semantic attributes exactly. Test source positions, authored escape provenance, and attribute order separately. Expected ASTs were validated against the schema and rendered to verify the supplied HTML; their sources have not passed the proposed parser behavior. HTML equivalence alone does not establish AST preservation.

The expanded case plan follows [issue #2877](https://github.com/markup-carve/carve/issues/2877). Implementation acceptance also requires native write/reparse preservation, formatting stability, source positions and source-preserving edits, links and other inline hosts, headings, lists, quotes, footnotes, table cells, and nesting-limit recovery. The shared set includes escaped apparent closers, consecutive attribute runs, apparent closers in attribute values, links, headings, quotes, lists, table cells, and a footnote body. Foreign output and source-preserving edits still need executable implementation tests. `remainingInlineDepth` means the number of additional inline nesting levels allowed in the host context; zero rejects even the first span. Bare and braced spans use the same existing budget. This is vector metadata, not a new public parser option. An over-limit matched span stays literal as a whole, including its closer, so it cannot prematurely close its parent. Its text retains the current inline source characters, including backslashes and code delimiters; it contains no parsed child nodes. Document ingestion policies apply before this recovery. Long malformed and deeply nested inputs must retain the delimiter-stack performance contract without repeated suffix searches.

Empty destinations, blank table rows, encoded code syntax, and unrelated importer fixes are outside this change. No changelog work is included.
