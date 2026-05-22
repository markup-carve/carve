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

**Decision:** For wiki-style internal links, use collapsed reference syntax `[Page Name][]` instead, which is unambiguous.

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

**Why rejected:**
- Extra row adds noise
- Alignment markers (`:--:`) are cryptic
- Creole's `|=` is cleaner and more explicit

**Decision:** `|=` prefix marks header cells directly, no separator row needed.

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

## Emoji Shortcodes: `:smile:`

**Proposed:**
```
Great work! :thumbsup: :rocket:
```

**Why rejected:**
- Conflicts with extension syntax `:type[content]`
- Requires maintaining emoji database
- Unicode emoji input is widely available now
- Platform-specific rendering issues

**Decision:** Use Unicode emoji directly or via extension `:emoji[rocket]` if needed.

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
spec with djot and the reference implementations.)

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
- Raw blocks with explicit format are cleaner

**Decision:** Use raw blocks with format specifier:
~~~
```raw html
<div class="custom">content</div>
```
~~~

---

## CriticMarkup Integration

**Proposed:**
```
This is {++added++} and {--removed--} text.
This is {~~old~>new~~} replacement.
```

**Status:** Included in spec (section 4.14) but as optional editorial markup.

**Considerations:**
- Useful for document review workflows
- Not needed for most documents
- Syntax is distinct and unambiguous

**Decision:** Included as optional feature for collaboration workflows.

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
