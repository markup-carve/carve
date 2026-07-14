# Dismissed Syntax Ideas

Ideas that were considered during Carve's design but ultimately rejected. Documented here for historical context and to explain why certain paths weren't taken.

---

## Link Syntax: `"text"(url)`

**Proposed:**
```
See the "documentation"(https://docs.example.com) for more.
Visit "Google"(https://google.com "Search engine") today.
```

**Rationale for proposal:**
- Matches natural speech: "I visited 'Google' at google.com"
- Quoted text is visually distinct from surrounding prose
- URL in parentheses feels like natural grouping
- No bracket/parenthesis order confusion (`[]()` vs `()[]`)

**Why rejected:**
- Quotes are heavily used in code and prose, creating ambiguity
- Breaks compatibility with Markdown/Djot ecosystem
- Tooling support would need to be built from scratch
- The benefit doesn't outweigh the ecosystem cost

**Decision:** Keep standard `[text](url)` syntax for ecosystem compatibility.

---

## Link Syntax: `[text -> url]`

**Proposed:**
```
Visit [Google -> https://google.com] for search.
```

**Rationale for proposal:**
- Arrow suggests direction/destination
- Single delimiter pair (`[]`) is simpler
- Reads naturally: "Google goes to URL"

**Why rejected:**
- Completely different from all existing formats
- `->` conflicts with smart typography (→)
- Would require entirely new tooling

---

## Link Syntax: `[[url | text]]`

**Proposed (wiki-style):**
```
See [[https://example.com/intro | the introduction]] for details.
```

**Rationale for proposal:**
- Familiar from MediaWiki, Org-mode
- Double brackets clearly delimit the link construct

**Why rejected:**
- **Ambiguous!** `[[` conflicts with valid nested spans in Djot:
  ```
  [[inner]{.attr} outer]{.attr}
  ```
- URL-first order is less natural for reading
- Would need special handling to avoid conflicts

**Decision:** For wiki-style internal links, use collapsed reference syntax `[Page Name][]` instead, which is unambiguous. (A `[[Page Name]]` *heading-reference* form - text-first, no URL - exists as a separate opt-in extension; the rejection here is the URL-first `[[url | text]]` core syntax.)

---

## Emphasis: `**bold**` (double asterisk)

**Proposed (Markdown-compatible):**
```
This is **bold** text.
```

**Why rejected:**
- Violates "visual mnemonic" principle - why does doubling make it stronger?
- More typing for a common operation
- Single `*` is sufficient and cleaner

**Decision:** Single `*bold*` for strong emphasis.

---

## Emphasis: `_italic_` (underscore for emphasis)

**Proposed (Djot-compatible):**
```
This is _italic_ text.
```

**Why rejected:**
- Underscore visually suggests underline, not italic
- `_` is literally "underneath" - perfect for underline
- Org-mode's `/italic/` is more visually mnemonic (slashes lean)

**Decision:** `/italic/` for emphasis, `_underline_` for underline.

---

## Attributes: `@class` prefix

**Proposed:**
```
# Heading @intro @important
![Image](photo.jpg)@hero @float-right
```

**Rationale for proposal:**
- Shorter than `{.class}`
- Familiar from CSS/social media

**Why rejected:**
- `@` is universally expected for mentions (`@username`)
- Would create ambiguity: is `@intro` a class or a user mention?
- Djot's `{.class #id}` syntax is proven and unambiguous

**Decision:** Keep `{.class #id key=value}` for attributes, reserve `@` for mentions.

---

## Table Headers: Separator Row

**Proposed (Markdown-compatible):**
```
| Name  | Age |
|-------|-----|
| Alice | 30  |
```

**Why rejected as the primary mechanism:**
- Extra row adds noise
- Alignment markers (`:--:`) are cryptic
- Creole's `|=` is cleaner and more explicit
- A separator row can only describe a single top header band; because `|=` marks
  a *cell*, it also expresses **row headers** (a `<th>` in a body row) - which a
  separator row cannot. See [Tables → Row Headers](./case-study/syntax#row-headers).

**Decision:** `|=` prefix marks header cells directly; no separator row is
*needed*. **Later amendment:** the GFM separator row *is* accepted as a
compatibility alias - a delimiter row as the second line of a table marks the
first row as the header and sets column alignment (pinned by corpus
`09-tables-3`), so pasted Markdown tables keep working. `|=` remains the
canonical Carve form and the only way to express row headers.

---

## Smart Fractions: `1/2` → ½

**Proposed:**
```
Add 1/2 cup of flour and 3/4 teaspoon of salt.
```

**Why rejected:**
- Ambiguous with file paths (`path/to/file`)
- Ambiguous with dates (`1/2/2024`)
- Ambiguous with division in code contexts
- Only a few fractions have Unicode equivalents

**Decision:** Not included. Use explicit Unicode (½) or leave as `1/2`.

> A draft of the grammar and reference implementation briefly added
> fractions with an anti-digit-gluing guard; that drift was reconciled by
> **removing** them — the guard still converted the date `1/2/2024` to
> `½/2024`. The grammar (PART 9 §8) and impl now match this decision.

---

## Built-in Emoji Semantics for `:smile:`

**Proposed:**
```
Great work! :thumbsup: :rocket:
```

**Why rejected (as an emoji feature):**
- Requires maintaining an emoji database in every implementation
- Unicode emoji input is widely available now
- Platform-specific rendering issues

**Decision:** the `:name:` *syntax* was kept, but as a semantics-free
**symbol** (djot's model): the parser records only the name, and mapping —
emoji or anything else — is processor configuration (`symbols` map or an
inline-renderer extension handler), with a literal `:name:` fallback. What
was dismissed is the built-in emoji database, not the syntax. See the
Symbols section in `examples.md`.

---

## Auto-linking Plain URLs Without Delimiters

**Proposed:**
```
Check out https://example.com for more.
```

**Status:** Dismissed.

**Considerations:**
- Trailing-punctuation handling (`(https://x)`, `https://x.`) is fiddly and
  a perennial source of surprise.
- djot itself does not auto-link bare URLs.
- The explicit `<url>` autolink already covers the need unambiguously.

**Decision:** Bare URLs are **not** auto-linked. Use the angle-bracket
autolink `<https://example.com>` for an explicit link. (This aligns the
spec with djot and the engine implementations.)

---

## Block-Level Variables/Templating

**Proposed:**
```
---
name: World
---

Hello, {{name}}!
```

**Why rejected:**
- Conflates markup with templating
- Adds parser complexity
- Many templating engines exist (Liquid, Jinja, Mustache)
- Keeps markup language focused on structure, not logic

**Decision:** Frontmatter provides metadata only. Templating is a separate processing step.

---

## Inline HTML Passthrough

**Proposed:**
```
This has <span class="special">inline HTML</span> embedded.
```

**Why rejected:**
- Security concerns (XSS vectors)
- Breaks output format independence (HTML-specific)
- Makes parsing more complex
- Raw blocks with an explicit format are cleaner

**Decision:** Use a raw block with a format specifier (djot's `=FORMAT`
syntax — symbol-based, no English keyword, symmetric with the inline
`{=format}` form):
~~~
```=html
<div class="custom">content</div>
```
~~~

---

## CriticMarkup: doubled-marker form (`{++added++}`)

> The CriticMarkup *feature* was adopted - it is part of the spec (section 4.14)
> with single-character markers. Only the **doubled-marker** form proposed
> below was dismissed. It lives here to record that choice.

**Proposed:**
```
This is {++added++} and {--removed--} text.
This is {~~old~>new~~} replacement.
```

**Status:** The feature is in the spec (section 4.14), but with **single**-character markers (`{+added+}`, `{-removed-}`, `{~old~>new~}`); the doubled-marker form shown above was not adopted.

**Considerations:**
- Useful for document review workflows
- Not needed for most documents
- Syntax is distinct and unambiguous

**Decision:** Included as optional feature for collaboration workflows.

---

## Headings: `=` prefix instead of `#`

**Proposed (AsciiDoc-style prefix):**
```
= Title       → <h1>
== Section    → <h2>
=== Sub       → <h3>
```
Count of markers = depth, same as `#`. This is a prefix marker, *not* setext
underline (`Title` / `=====`); setext is dismissed separately, see the rationale
on `---` overloading in `technical-rationale.md`.

**Rationale for proposal:**
- Frees `#` to be the unambiguous tag sigil. Today `#` is dual-purpose: `# x`
  (with a space) is a heading, `#x` is a tag, disambiguated only by the space.
  `= heading` + `#tag` gives "`#` always means tag" — matching how every social
  platform trains the reader.
- The heading/non-heading collision becomes rarer: a line that *starts* with a
  highlight (`=hot=`) is far less common than a line that starts with a tag.
- `=` is unshifted (faster than Shift+3 for `#`); `=` reads as a title/underline
  bar pulled to the front.
- Aligns with AsciiDoc, a stated influence.

**Why rejected:**
- **Breaks the most universal lightweight-markup convention.** `#` headings are
  the one token every Markdown user knows, and Carve explicitly builds on
  Markdown's basics — this is the single largest adoption tax available.
- **It moves the ambiguity, it doesn't remove it.** `=text=` is highlight, so
  `= heading` vs `=highlight=` falls back on the same space-after rule that
  `#`/`#tag` already uses. The `#`/tag collision is *already* resolved
  deterministically by that rule.
- **`=` is the most overloaded glyph in Carve** (`=highlight=`, `key=value`
  attributes, `|=` table-header marker). `#` at line start is comparatively
  uncluttered.
- **AsciiDoc level-offset trap:** in AsciiDoc `==` renders as `<h2>` (levels are
  offset by one), so borrowing the syntax invites off-by-one mistakes against
  the very language it came from.
- Pure churn: the heading marker is special-cased in the grammar, both parsers,
  the corpus, and all four highlighters (tree-sitter, vscode, zed, carve-lsp).
- Parsing cost is *not* a factor either way — prefix `=` is O(n) and
  lookahead-free, exactly like `#`. The decision is mnemonics/familiarity, not
  parser architecture.

**Decision:** Keep `#` for headings. If the `#heading` vs `#tag` ambiguity needs
addressing, the higher-ROI path is a lint/warning on a line-leading `#Word`
(likely a heading typo), not a syntax swap.

---

## Links: Slack-style `<url|title>` labeled autolinks

**Proposed (Slack mrkdwn form):**
```
See <https://docs.example.com|the documentation> for more.
```

**Rationale for proposal:**
- Compact single-token feel: paste the URL first, add the label after a pipe
- Reuses the angle-bracket slot that autolinks already occupy
- Familiar to anyone writing Slack bots or mrkdwn messages

**Considerations:**
- **Duplicate of `[title](url)`.** Slack only has this form because mrkdwn has
  no bracket-parenthesis links; Carve does. A second spelling for the same
  construct violates "one syntax, one meaning". (Slack's own docs call their
  format explicitly *not* Markdown.)
- **The false-positive surface explodes.** Today a `<` fails FAST: the autolink
  body is url-characters only (no spaces), so `a < b`, `List<T>` and HTML
  samples resolve as literal text immediately. Allowing a spaced title turns
  any prose `< ... | ... >` into a link candidate: `cat <input|sort >out`
  (shell pipes!), `<(foo|bar)>` (regex alternation), `x < y|z > w`. All literal
  today; all silent links under the proposal.
- **Spaces end the token property.** With a spaced title, `<...>` is no longer
  a scannable token but a delimited span - so which `>` closes
  `<url|a > b>`? Either answer needs a new escaping context (`\>` inside
  titles) in a construct designed to never need one.
- **Architectural collision with tables.** The cell splitter runs at block
  level (two-phase model, PART 8) and splits on unescaped `|` outside code
  spans; `| <u|t> |` tears the link across two cells. Fixing that would make
  the block phase understand inline-link internals. Escaping does not help:
  destinations have no escape processing (normative), so `<u\|t>` puts a
  literal backslash into the URL.
- **Breaks an existing security invariant.** The angle form currently
  guarantees display text = destination (`<http://evil.com>` can only show
  where it goes). `<evil.com|paypal.com>` reintroduces text-vs-target phishing
  in the one link syntax that was immune on sight.
- **Breaking change to existing documents.** `</#a|b>` parses today as a
  cross-reference with id `a|b` (crossref ids allow the pipe); pipe-as-title
  would silently change the meaning of valid current documents.
- **Fail-fast parsing dies.** Every `<` in prose would need a scan to end of
  line hunting `|...>` before conceding "literal" - unbounded lookahead on one
  of the most common prose characters, instead of aborting at the first space.
- **Degenerate-case tax.** `<|title>`, `<url|>`, `<a||b>`, nested
  `<u1|see <u2>>` - each needs a rule, a corpus pin and three implementations,
  to buy a duplicate feature.

**Decision:** Rejected as input syntax. Slack mrkdwn remains interesting as an
OUTPUT target instead: a `carveToSlack` renderer maps naturally (`*bold*` and
`~strike~` are even identical) and links become `<url|title>` on the way out,
where none of the above conflicts exist.

---

## Summary

Most rejected ideas fall into these categories:

1. **Ecosystem compatibility** - Breaking from Markdown/Djot conventions has high cost
2. **Ambiguity** - Syntax that conflicts with other features or common text patterns
3. **Scope creep** - Features that belong in separate tools (templating, rendering)
4. **Visual mnemonic violation** - Syntax that doesn't visually suggest its meaning

Carve prioritizes:
- Unambiguous parsing
- Visual mnemonics where possible
- Ecosystem compatibility where it doesn't compromise clarity
- Separation of concerns (markup vs. templating vs. rendering)
