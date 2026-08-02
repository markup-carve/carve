# Dismissed Syntax Ideas

Ideas that were considered during Carve's design but ultimately rejected. Documented here for historical context and to explain why certain paths weren't taken.

---

## Link Syntax: `"text"(url)` (quoted text)

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

## Link Syntax: `[text -> url]` (arrow)

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

## Link Syntax: `[[url | text]]` (wiki-style)

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

> The CriticMarkup *feature* was adopted - it is part of the spec
> with single-character markers. Only the **doubled-marker** form proposed
> below was dismissed. It lives here to record that choice.

**Proposed:**
```
This is {++added++} and {--removed--} text.
This is {~~old~>new~~} replacement.
```

**Status:** The feature is in the spec, but with **single**-character markers (`{+added+}`, `{-removed-}`, `{~old~>new~}`); the doubled-marker form shown above was not adopted.

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

## Symbols: a braced `{:name:}` form for intraword use

**Proposed:**
```
Ship it{:+1:}now
```

**Rationale for proposal:**
- A symbol only opens at the start of content or after a non-word character
  (the leading-boundary guard, PART 9 §7), so `word:+1:` is literal text.
  A braced form would force the symbol where a bare one cannot open.
- It would mirror the brace-pair convention Carve already has: `{*bold*}`
  forces intraword emphasis, and `{^x^}` / `{,x,}` are the *only* form of
  superscript and subscript. "Braces force it intraword" is already learned.
- The syntax is unclaimed: an attribute block cannot start with `:`, and
  `{:name:}` today produces the nonsense `{` + resolved symbol + `}` (the
  brace merely satisfies the boundary guard and is then literal).

**Considerations:**
- **No demonstrated need.** Shortcodes sit between spaces in essentially all
  real prose - that is exactly why the boundary guard is safe in the first
  place. The intraword case is hypothetical; it did not come up until someone
  went looking for it.
- **The guard it works around is load-bearing.** `word:+-:` is literal for the
  same reason `10:30:` and `a:b:c` are: a colon glued to a word never opens a
  symbol, whatever the symbols map contains. That protection is the feature.
- **A new inline form is not one production.** Every added inline syntax ripples
  through the tree-sitter grammar, the TextMate / Prism / highlight.js
  grammars, the editor plugins (vim, emacs, sublime, vscode, intellij, zed,
  helix), the corpus, and all three engines. That is a large, permanent bill
  for a case with no user behind it.
- **A workaround exists if it is ever truly needed.** `word[:+1:]{}` renders
  the symbol intraword today (the bracket satisfies the guard; the span carries
  the attributes). It is deliberately NOT documented: it is a coincidence, not
  an interface, and it emits an empty attribute block and a `<span>` wrapper.
  Documenting it would freeze both artifacts.

**Decision:** Deferred, not rejected. The design is recorded here so it is not
re-litigated; `{:` stays unclaimed. If a real document ever needs an intraword
symbol, this is the form to add - and the argument for it will be an actual use
case rather than a hypothetical one.

---

## Sidenotes: `[>content]`

**Proposed:**
```
The margin carries the aside.[>A note that sits beside the text.]
```

**Rationale for proposal:**
- Margin notes are a well-established typographic form (Tufte-style layouts).
- The `[>` opener was unclaimed and visually suggests "push this to the side".
- It would have sat next to the two footnote forms already in core: the
  reference form `[^label]` and the inline form `^[content]` (PART 9 §16).

**Why rejected:**
- **It is a presentation concern, not a language one.** A sidenote and a
  footnote carry the same thing: a note bound to a point in the text. Whether
  that note is set in the margin, at the foot of the page, or in an endnote
  pool is a decision about layout, not about what the document means.
- **The existing machinery already covers it.** Footnotes and inline footnotes
  produce numbered, back-linked notes with stable ids. A host that wants margin
  notes styles those with CSS; nothing in the parse tree needs to change.
- **A new inline form is never one production.** It would ripple through the
  tree-sitter, TextMate, Prism and highlight.js grammars, every editor plugin,
  the corpus, and all three engines, to buy a CSS rule.

**Decision:** Dismissed. Sidenotes are rendered by styling the existing
footnote and endnote output; Carve gains no sidenote syntax. The decision
record is issue #163, where the "purely a display issue" argument was accepted
and the request closed.

**The `[>` slot:** `[>` is **not** claimed by any construct. `[>foo]` is
ordinary literal text today and is pinned as such by the corpus. Nothing is
reserved here, and a future proposal is free to use the slot on its own merits.

---

## Mentions: a bracketed `@[Display Name]` form for labels with spaces

**Proposed:**
```
cc @[Mark Scherer]
cc @[Mark Scherer](/users/42)
```

**Rationale for proposal:**
- A mention name is `name_word, {'.', name_word}` (PART 19), so it cannot hold a
  space, an apostrophe or a slash. Real display names hold all three:
  `Mark Scherer`, `o'brien`.
- Editors store mentions that way. A ProseMirror/Tiptap mention node carries the
  label the user picked plus an id, so an application bridging an editor to Carve
  has a display name in hand and no form to write it in.
- Brackets carrying a label is a convention Carve already has: `^[content]` for an
  inline footnote, `:kbd[x]` for a semantic span, `[text]{.class}` for an
  attributed one.
- The opener looks unclaimed: `@[foo]` renders as literal text today.

**Why rejected:**
- **It supplies the wrong half.** A mention's name *is* its identity, not its
  presentation - the AST publishes a mention as one field, its user, and a Tier-2
  URL template interpolates that name into a URL. `@[Mark Scherer]` gives a label
  and no key, so a configured template would build a profile URL out of a display
  name.
- **The two-slot form is already taken, and already useful.**
  `@[Mark Scherer](/users/42)` parses today as a literal `@` followed by an
  ordinary link, and all three engines render it identically as
  `@<a href="/users/42">Mark Scherer</a>`. Giving it a new meaning would silently
  change existing documents rather than claim empty space.
- **The construct exists already, under the name that fits it.**
  `[Mark Scherer]{.mention data-id=42}` and `[Mark Scherer](/users/42){.mention}`
  both render as a classed span and anchor, and both round trip through source and
  through the ProseMirror bridge with nothing dropped or degraded. A labeled
  reference to a person is a span or a link that carries a class; the thing that
  makes it a mention to a host is the class, which the host is styling and
  resolving either way.
- **A new inline form is never one production.** It would ripple through the
  tree-sitter, TextMate, Prism and highlight.js grammars, every editor plugin, the
  corpus, and all engines, to buy a spelling for something already spellable.

**Decision:** Dismissed. A mention names an identifier. Where a document needs a
display label bound to an identity, that is a span or a link carrying a class and
attributes, and the mention syntax stays a name.

This does **not** cover what a renderer should do when a label that is not a valid
name reaches it anyway, through a bridge or a hand-built AST. Silently deleting the
offending characters - turning `o'brien` into `obrien`, a different and plausible
user - is a defect rather than a design; see markup-carve/carve-php#535.

**The `@[` slot:** `@[` is **not** claimed by any construct. `@[foo]` is ordinary
literal text in carve-php, carve-js and carve-rs alike. Note that the slot is only
free while the bracket stands alone: `@` followed by a link is a real rendering
today, so a future proposal may take `@[label]` on its own merits but cannot take
`@[label](url)` without breaking documents.

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
