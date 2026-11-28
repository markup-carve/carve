---
description: Syntax ideas considered during design and rejected, with the reasoning that killed each one.
---

# Dismissed Syntax Ideas

Ideas that were considered during Carve's design but ultimately rejected. Documented here for historical context and to explain why certain paths weren't taken.

Most entries were decided for 0.1, and the reasoning is kept as it was argued. Where Carve 0.2 changed the outcome, the entry says so and names what 0.2 does instead. One idea dismissed for 0.1, the `=` heading prefix, is part of 0.2. For an existing 0.1 document, use the [upgrade guide](./upgrade-0-2) rather than a find and replace pass: several unchanged spellings change HTML.

---

## Spellings 0.2 removed

0.2 keeps one spelling per construct. These spellings were valid in 0.1, or common in other languages, and a 0.2 parser reads them under its own rules:

| Proposed spelling | 0.2 form or behavior |
|---|---|
| `**strong**` | A repeated bare star is literal; use `*strong*`. |
| `_emphasis_` | Bare underscore is text; use `/emphasis/`. A 0.1 `_x_` was underline and upgrades to `{_x_}`. |
| `~~strike~~` | Bare tilde is text; use `{~strike~}`. |
| `---` as a break | Use `***`; a hyphen run is not a thematic break. |
| Tilde code fences | Use a backtick fence. |
| GFM table separator | Mark header cells with `|=`. |
| `+` as a list continuation | Indent the following block within its owner. |
| Implicit raw HTML | Use an explicit raw form and an enabled host policy. |

In a 0.1 document, `carve upgrade` rewrites `---` breaks, tilde fences, GFM separator rows, `+` continuation lines and bare `_` and `~` pairs, and reports raw HTML for review. `**` and `~~` were already text in 0.1, so it leaves them as they are.

---

## Link Syntax: `"text"(url)` (quoted text)

**Proposed:**
```text
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
```text
Visit [Google -> https://google.com] for search.
```

**Rationale for proposal:**
- Arrow suggests direction/destination
- Single delimiter pair (`[]`) is simpler
- Reads naturally: "Google goes to URL"

**Why rejected:**
- Completely different from all existing formats
- Would require entirely new tooling

---

## Link Syntax: `[[url | text]]` (wiki-style)

**Proposed (wiki-style):**
```text
See [[https://example.com/intro | the introduction]] for details.
```

**Rationale for proposal:**
- Familiar from MediaWiki, Org-mode
- Double brackets clearly delimit the link construct

**Why rejected:**
- **Ambiguous!** `[[` conflicts with valid nested spans:
  ```crv
  [[inner]{.attr} outer]{.attr}
  ```
- URL-first order is less natural for reading
- Would need special handling to avoid conflicts

**Decision:** For wiki-style internal links, use collapsed reference syntax `[Page Name][]` instead, which is unambiguous. In 0.2 it links to a heading of that name in the same document, with no definition needed.

**0.2 change:** 0.1 also had a text-first `[[Page Name]]` heading-reference extension. 0.2 drops that spelling: `[[Page Name]]` is text, and a host that wants wiki links registers the standard `wiki` inline extension, written `:wiki[Page]` or `:wiki[Page|Display]`, which needs no new delimiter. The rejection of the URL-first `[[url | text]]` core syntax stands.

---

## Emphasis: `**bold**` (double asterisk)

**Proposed (Markdown-compatible):**
```text
This is **bold** text.
```

**Why rejected:**
- Violates "visual mnemonic" principle - why does doubling make it stronger?
- More typing for a common operation
- Single `*` is sufficient and cleaner

**Decision:** Single `*bold*` for strong emphasis. In 0.2 a run of two or more stars is text, asterisks included, and lint reports `**bold**` as `markdown-strong-double-star`.

---

## Emphasis: `_italic_` (underscore for emphasis)

**Proposed (Djot-compatible):**
```text
This is _italic_ text.
```

**Why rejected:**
- Underscore visually suggests underline, not italic
- `_` is literally "underneath" - perfect for underline
- Org-mode's `/italic/` is more visually mnemonic (slashes lean)

**Decision:** `/italic/` for emphasis, `_underline_` for underline.

**0.2 change:** `/italic/` stays, but underline is no longer a bare delimiter. In 0.2 only `/` and `*` pair as bare emphasis; a bare `_` is text, so `snake_case` and `_my_var_` never turn into underline, and underline is the braced `{_underline_}`. The same move made strike `{~strike~}` and highlight `{=highlight=}` braced-only.

::: compare
```crv
/italic/, {_underline_} and snake_case
```
```html
<p><em>italic</em>, <u>underline</u> and snake_case</p>
```
:::

---

## Attributes: `@class` prefix

**Proposed:**
```text
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

**Decision:** Keep `{.class #id key=value}` for attributes, reserve `@` for mentions. This holds in 0.2: `# Heading @intro` is a heading holding the mention `@intro`.

---

## Table Headers: Separator Row

**Proposed (Markdown-compatible):**
```markdown
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
  separator row cannot. See [Tables, Row Headers](./case-study/syntax#row-headers).

**Decision:** `|=` prefix marks header cells directly; no separator row is
*needed*. **Later 0.1 amendment:** the GFM separator row *was* accepted as a
compatibility alias - a delimiter row as the second line of a table marked the
first row as the header and set column alignment (pinned by 0.1 corpus
`09-tables-3`), so pasted Markdown tables kept working. `|=` remained the
canonical Carve form and the only way to express row headers.

**0.2 change:** 0.2 removes the alias. A separator row is an ordinary body row
of dashes, and alignment is written on the header cell, `|={<}`, `|={~}` or
`|={>}`. `carve upgrade` rewrites a 0.1 separator row, and the reference engine's GFM importer
(`--from gfm`) converts pasted Markdown tables.

::: compare
```crv
|= Name |={>} Age |
| Alice | 30 |
```
```html
<table>
  <thead>
    <tr><th scope="col">Name</th><th scope="col" style="text-align: right;">Age</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td style="text-align: right;">30</td></tr>
  </tbody>
</table>
```
:::

---

## Smart Fractions: `1/2` to ½

**Proposed:**
```text
Add 1/2 cup of flour and 3/4 teaspoon of salt.
```

**Why rejected:**
- Ambiguous with file paths (`path/to/file`)
- Ambiguous with dates (`1/2/2024`)
- Ambiguous with division in code contexts
- Only a few fractions have Unicode equivalents

**Decision:** Not included. Use explicit Unicode (½) or leave as `1/2`. 0.2 keeps this: its smart typography covers quotes, dashes, the ellipsis, arrows and a few signs, and no fractions.

> A draft of the 0.1 grammar and reference implementation briefly added
> fractions with an anti-digit-gluing guard; that drift was reconciled by
> **removing** them, because the guard still converted the date `1/2/2024` to
> `½/2024`.

---

## Built-in Emoji Semantics for `:smile:`

**Proposed:**
```text
Great work! :thumbsup: :rocket:
```

**Why rejected (as an emoji feature):**
- Requires maintaining an emoji database in every implementation
- Unicode emoji input is widely available now
- Platform-specific rendering issues

**Decision:** the `:name:` *syntax* was kept, but as a semantics-free
**symbol** (Djot's model): the parser records only the name, and mapping,
emoji or anything else, is processor configuration (a `symbols` map, or
`carve render --symbols <json>`, or an extension), with a literal `:name:`
fallback. What was dismissed is the built-in emoji database, not the syntax.
0.2 keeps this model: an unknown symbol is written as the characters typed.

---

## Auto-linking Plain URLs Without Delimiters

**Proposed:**
```text
Check out https://example.com for more.
```

**Status:** Dismissed.

**Considerations:**
- Trailing-punctuation handling (`(https://x)`, `https://x.`) is fiddly and
  a perennial source of surprise.
- Djot itself does not auto-link bare URLs.
- The explicit `<url>` autolink already covers the need unambiguously.

**Decision:** Bare URLs are **not** auto-linked, in 0.1 or 0.2. Use the
angle-bracket autolink `<https://example.com>` for an explicit link.

---

## Block-Level Variables/Templating

**Proposed:**
```text
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

**0.2 note:** 0.2 adds [snippets](./snippets), which are not this proposal. A
snippet is a piece of inline text named and defined in the document itself,
`{$name}: value`, and copied with <code v-pre>{{ $name }}</code>. It has no
logic, no conditions and no access to frontmatter: <code v-pre>{{name}}</code>
in the sample above is still text. An application that needs more can
register an extension, but it must keep a core fallback (see
[Extensions](./extensions)).

---

## Inline HTML Passthrough

**Proposed:**
```text
This has <span class="special">inline HTML</span> embedded.
```

**Why rejected:**
- Security concerns (XSS vectors)
- Breaks output format independence (HTML-specific)
- Makes parsing more complex
- Raw blocks with an explicit format are cleaner

**Decision:** Use a raw block with a format specifier (Djot's `=FORMAT`
syntax: symbol-based, no English keyword, symmetric with the inline
`{=format}` form):

````crv
```=html
<div class="custom">content</div>
```
````

In 0.2 a bare tag in the source is text, and even the explicit raw forms are
written escaped unless the host turns on `rawHtml` (`carve render --raw-html`).
In 0.1 that option was on unless the host turned it off. See
[Security](./security).

---

## CriticMarkup: doubled-marker form (`{++added++}`)

> The CriticMarkup *feature* was adopted - it is part of the spec
> with single-character markers. Only the **doubled-marker** form proposed
> below was dismissed. It lives here to record that choice.

**Proposed:**
```text
This is {++added++} and {--removed--} text.
This is {~~old~>new~~} replacement.
```

**Status:** The feature is in the spec, but with **single**-character markers (`{+added+}`, `{-removed-}`); the doubled-marker form shown above was not adopted.

**Considerations:**
- Useful for document review workflows
- Not needed for most documents
- Syntax is distinct and unambiguous

**Decision:** Included as optional feature for collaboration workflows.

**0.2 change:** 0.1 also had a single-marker substitution, `{~old~>new~}`. 0.2
drops it, because `{~...~}` is now the braced strike: write the replacement as a
deletion followed by an insertion. Inserts, deletions and comments take
`author` and `datetime` attributes in 0.2 (see
[Revision metadata](./revision-metadata)).

::: compare
```crv
This is {+added+} and {-removed-} text, and {-old-}{+new+}.
```
```html
<p>This is <ins>added</ins> and <del>removed</del> text, and <del>old</del><ins>new</ins>.</p>
```
:::

---

## Headings: `=` prefix instead of `#`

**0.2 reversal:** this idea was dismissed for 0.1 and adopted in 0.2. In 0.2
`=` starts a heading next to `#`, with `=` as level 1, `==` as level 2 and so
on, and lint reports a document that mixes both. The 0.1 reasoning is kept
below; the notes after it say which arguments 0.2 removed.

**Proposed (AsciiDoc-style prefix):**
```text
= Title       -> <h1>
== Section    -> <h2>
=== Sub       -> <h3>
```
Count of markers = depth, same as `#`. This is a prefix marker, *not* setext
underline (`Title` / `=====`); setext is dismissed separately, see the rationale
on `---` overloading in [Technical rationale](./technical-rationale).

**Rationale for proposal:**
- Frees `#` to be the unambiguous tag sigil. Today `#` is dual-purpose: `# x`
  (with a space) is a heading, `#x` is a tag, disambiguated only by the space.
  `= heading` + `#tag` gives "`#` always means tag", matching how every social
  platform trains the reader.
- The heading/non-heading collision becomes rarer: a line that *starts* with a
  highlight (`=hot=`) is far less common than a line that starts with a tag.
- `=` is unshifted (faster than Shift+3 for `#`); `=` reads as a title/underline
  bar pulled to the front.
- Aligns with AsciiDoc, a stated influence.

**Why rejected (0.1):**
- **Breaks the most universal lightweight-markup convention.** `#` headings are
  the one token every Markdown user knows, and Carve explicitly builds on
  Markdown's basics. This is the single largest adoption tax available.
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
- Parsing cost is *not* a factor either way: prefix `=` is O(n) and
  lookahead-free, exactly like `#`. The decision is mnemonics/familiarity, not
  parser architecture.

**0.1 decision:** Keep `#` for headings. If the `#heading` vs `#tag` ambiguity
needs addressing, the higher-ROI path is a lint/warning on a line-leading
`#Word` (likely a heading typo), not a syntax swap.

**What changed for 0.2:** two of the arguments above lost their premise. Bare
`=` is no longer a highlight delimiter (highlight is braced, `{=hot=}`), so
`= heading` no longer competes with `=highlight=`. And 0.2 adds `=` instead of
swapping it for `#`, so Markdown's `#` headings keep working and the adoption
tax is gone. A line in prose that starts with `=` and a space is now a
heading; `carve upgrade` escapes such a 0.1 line as `\=`.

::: compare
```crv
= Title

== Section
```
```html
<section id="Title">
  <h1>Title</h1>
  <section id="Section">
    <h2>Section</h2>
  </section>
</section>
```
:::

---

## Links: Slack-style `<url|title>` labeled autolinks

**Proposed (Slack mrkdwn form):**
```text
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
  level (the block pass splits a row into cells before any inline form is read)
  and splits on unescaped `|` outside code spans; `| <u|t> |` tears the link
  across two cells. Fixing that would make the block phase understand
  inline-link internals. Escaping does not help: destinations have no escape
  processing, so `<u\|t>` puts a literal backslash into the URL.
- **Breaks an existing security invariant.** The angle form currently
  guarantees display text = destination (`<http://evil.com>` can only show
  where it goes). `<evil.com|paypal.com>` reintroduces text-vs-target phishing
  in the one link syntax that was immune on sight.
- **Breaking change to existing documents.** `</#a|b>` parses today as a
  cross-reference with id `a|b` (cross-reference ids allow the pipe, in 0.2 as
  in 0.1); pipe-as-title would silently change the meaning of valid current
  documents.
- **Fail-fast parsing dies.** Every `<` in prose would need a scan to end of
  line hunting `|...>` before conceding "literal" - unbounded lookahead on one
  of the most common prose characters, instead of aborting at the first space.
- **Degenerate-case tax.** `<|title>`, `<url|>`, `<a||b>`, nested
  `<u1|see <u2>>` - each needs a rule, a corpus pin and three implementations,
  to buy a duplicate feature.

**Decision:** Rejected as input syntax. Slack mrkdwn remained interesting as an
OUTPUT target instead: a Slack renderer maps naturally (`*bold*` is even
identical) and links become `<url|title>` on the way out, where none of the
above conflicts exist. 0.2 specifies HTML as its only output; any other output
target is engine behavior outside the specification.

---

## Symbols: a braced `{:name:}` form for intraword use

**Proposed:**
```text
Ship it{:+1:}now
```

**Rationale for proposal:**
- A symbol only opens at the start of content or after a character that is not
  a letter or number (the leading-boundary guard), so `word:+1:` is literal
  text. A braced form would force the symbol where a bare one cannot open.
- It would mirror the brace-pair convention Carve already has: `{*bold*}`
  forces intraword emphasis, and `{^x^}` / `{,x,}` are the *only* form of
  superscript and subscript. "Braces force it intraword" is already learned.
- ~~The syntax is unclaimed: an attribute block cannot start with `:`~~, and
  `{:name:}` produces the nonsense `{` + resolved symbol + `}` (the
  brace merely satisfies the boundary guard and is then literal).
  **The first half of that is no longer true** - see the amendment below.

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
- **A workaround exists if it is ever needed.** `word[:+1:]{}` renders
  the symbol intraword (the bracket satisfies the guard; the span carries
  the attributes). It is deliberately NOT documented: it is a coincidence, not
  an interface, and it emits an empty attribute block and a `<span>` wrapper.
  Documenting it would freeze both artifacts.

**Decision:** Deferred, not rejected, and still deferred in 0.2, where
`{:+1:}` is text. The design is recorded here so it is not re-litigated. If a
real document ever needs an intraword symbol, this is the form to add - and the
argument for it will be an actual use case rather than a hypothetical one.

**Amendment (`carve#1114`): `{:` is now partly claimed, and this form survives
it.** An attribute block may start with `:` - it is the language attribute,
`{:fr}` for `lang="fr"`, in 0.2 as in late 0.1.
So the "unclaimed slot" bullet above no longer describes the language.

That does not withdraw this entry, because the two forms cannot collide. A
language subtag is ASCII alphanumeric, so a tag can never end in `:`, while a
braced symbol always does; `{:tada:}` fails the language production on its
trailing colon and stays literal exactly as it did before. The 0.1 corpus pins
that directly (`138-unclaimed-openers-stay-literal`), so the day this form
ships, the fixture that protects it is already there.

What DID change is the cost side of the argument, in this form's favor. The
language attribute proved a `{:`-opening attribute costs one alternative in the
attribute rule and one action, because it desugars into an existing key/value.
A braced symbol would still be a new INLINE form, which is the bill the third
consideration above prices - grammars, editors, three engines. The two are not
comparable, and the fact that one was cheap is not evidence that the other is.

::: compare
```crv
[bonjour]{:fr} and it{:+1:}now
```
```html
<p><span lang="fr">bonjour</span> and it{:+1:}now</p>
```
:::

---

## Sidenotes: `[>content]`

**Proposed:**
```text
The margin carries the aside.[>A note that sits beside the text.]
```

**Rationale for proposal:**
- Margin notes are a well-established typographic form (Tufte-style layouts).
- The `[>` opener was unclaimed and visually suggests "push this to the side".
- It would have sat next to the two footnote forms already in core: the
  reference form `[^label]` and the inline form `^[content]`.

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
record is issue `carve#163`, where the "purely a display issue" argument was
accepted and the request closed.

**The `[>` slot:** `[>` is **not** claimed by any construct. `[>foo]` is
ordinary literal text, in 0.2 as in 0.1. Nothing is reserved here, and a future
proposal is free to use the slot on its own merits.

---

## Mentions: a bracketed `@[Display Name]` form for labels with spaces

**Proposed:**
```text
cc @[Mark Scherer]
cc @[Mark Scherer](/users/42)
```

**Rationale for proposal:**
- A mention name is one or more runs of letters, digits, `_` and `-` joined by
  single dots, so it cannot hold a space, an apostrophe or a slash. Real display
  names hold all three: `Mark Scherer`, `o'brien`.
- Editors store mentions that way. A ProseMirror/Tiptap mention node carries the
  label the user picked plus an id, so an application bridging an editor to Carve
  has a display name in hand and no form to write it in.
- Brackets carrying a label is a convention Carve already has: `^[content]` for an
  inline footnote, `:kbd[x]` for an inline extension, `[text]{.class}` for an
  attributed span.
- The opener looks unclaimed: `@[foo]` renders as literal text.

**Why rejected:**
- **It supplies the wrong half.** A mention's name *is* its identity, not its
  presentation - the AST publishes a mention as one field, its user, and a host
  URL template interpolates that name into a URL. `@[Mark Scherer]` gives a label
  and no key, so a configured template would build a profile URL out of a display
  name.
- **The two-slot form is already taken, and already useful.**
  `@[Mark Scherer](/users/42)` parses as a literal `@` followed by an
  ordinary link, and all three engines render it identically as
  `@<a href="/users/42">Mark Scherer</a>`. Giving it a new meaning would silently
  change existing documents rather than claim empty space.
- **The construct exists already, under the name that fits it.**
  `[Mark Scherer]{.mention data-id=42}` and `[Mark Scherer](/users/42){.mention}`
  render as a classed span and anchor, and both round trip through source and
  through the ProseMirror bridge with nothing dropped or degraded. A labeled
  reference to a person is a span or a link that carries a class; the thing that
  makes it a mention to a host is the class, which the host is styling and
  resolving either way.
- **A new inline form is never one production.** It would ripple through the
  tree-sitter, TextMate, Prism and highlight.js grammars, every editor plugin, the
  corpus, and all engines, to buy a spelling for something already spellable.

**Decision:** Dismissed, in 0.1 and 0.2. A mention names an identifier. Where a
document needs a display label bound to an identity, that is a span or a link
carrying a class and attributes, and the mention syntax stays a name.

::: compare
```crv
cc @[Mark Scherer] and @[Mark Scherer](/users/42) and [Mark Scherer]{.mention data-id=42}
```
```html
<p>cc @[Mark Scherer] and @<a href="/users/42">Mark Scherer</a> and <span class="mention" data-id="42">Mark Scherer</span></p>
```
:::

This does **not** cover what a renderer should do when a label that is not a valid
name reaches it anyway, through a bridge or a hand-built AST. Silently deleting the
offending characters - turning `o'brien` into `obrien`, a different and plausible
user - is a defect rather than a design; see markup-carve/carve-php#535.

**The `@[` slot:** `@[` is **not** claimed by any construct. `@[foo]` is ordinary
literal text. Note that the slot is only free while the bracket stands alone: `@`
followed by a link is a real rendering, so a future proposal may take `@[label]`
on its own merits but cannot take `@[label](url)` without breaking documents.

---

## Definition lists: per-`<dt>`/`<dd>` attributes (glued-marker form)

**Proposed:**
```text
::{#tcp .proto} TCP
:{.lead}  Reliable, ordered transport.
```

**Rationale for proposal:**
- `<dt>` and `<dd>` are the only per-unit block sub-elements in Carve with no attribute hook
- Every other repeated per-unit part already has a glued-marker form: `-{.c}` on a list item, `| ... |{.c}` on a table row, and cells
- A whole `<dl>` can be attributed with a preceding `{...}` line, but an individual term or definition cannot
- The design is a straight copy of the list-item pattern, so it introduces no new shape of rule

**Why deferred:**
- No concrete demand has appeared. The gap is real but symmetric-looking rather than reported
- It is not free: a syntax form has to land in all three engines plus the canonical writer, and the degrade behavior (`::{bad!}` falls back to a paragraph) needs pinning in each
- The whole-`<dl>` attribute already covers the common case, and an `<dt>` that needs an id can be reached with a heading or a span

**Decision:** Deferred, not rejected, and still deferred in 0.2, where the proposed lines are a paragraph. This is an intentional non-goal for now rather than a hole nobody noticed - the analysis and the concrete design are kept in [carve#277](https://github.com/markup-carve/carve/issues/277) so it can be picked up if a real need shows up.

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

0.2 added a fifth priority, one spelling per construct, which is why it removed
several 0.1 aliases and moved underline, strike and highlight into braces.

**Specification (external):** [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (C2-I-046 to C2-I-053 emphasis, C2-I-090 to C2-I-097 mentions, tags, symbols and cross-references, C2-I-104 to C2-I-117 smart typography), [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (headings, thematic break, tables), [HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md), [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md) (C2-X-057 `wiki`), [Upgrading from 0.1](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md) (U-055, U-065 to U-069, U-101).
