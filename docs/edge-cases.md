# Carve Edge Cases Analysis

> **Non-normative.** This document analyzes tricky cases for humans. The
> normative specification is [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf)
> (PART 9 for semantic constraints); `docs/examples.md` + `tests/corpus`
> are the conformance contract. On any disagreement, the grammar wins.

This document analyzes potentially ambiguous or tricky parsing scenarios in Carve syntax.

---

## 1. Italic `/text/` vs File Paths

**Problem:** Slashes are common in paths and URLs.

**Resolution:** Carve uses a word-boundary emphasis rule that is *stricter*
than Djot (Djot's `_`/`*` rule is purely whitespace-flanking; Carve adds
word-boundary conditions so intraword `a/b/c`, `foo_bar_baz`, and `snake_case`
stay literal). The normative statement lives in `resources/grammar.ebnf`
PART 9 §9; in summary, for `/` and `_`:
- **opens** only if *not* followed by whitespace **and** preceded by the start
  of the line/block, whitespace, or punctuation — but not by an alphanumeric,
  `_`, or the same delimiter (so `(/x/)` and `a./b/` open, while `snake_/case/`
  and `//a/` do not)
- **closes** only if *not* preceded by whitespace **and** *not* followed by an
  alphanumeric (so `x /a/b y` stays literal — the candidate closer is followed
  by `b`)
- inner `/` characters become literal content (same-type spans do not nest)

The **same-delimiter adjacency** part of that rule — a delimiter adjacent to
another of the same delimiter (before or after) does not open — is *not*
`/`-and-`_`-only; it applies to all five single-character delimiters. So a
doubled delimiter is always literal: `**x**`, `~~x~~`, and `^^x^^` render
verbatim, exactly like `//x//` and `__x__` (corpus
`71-doubled-emphasis-delimiters`). Only the alphanumeric/`_` word-boundary
conditions remain specific to `/` and `_`.

**This means a path in an emphasizing position still italicizes:**
`/usr/local/` → `<em>usr/local</em>` (verified — corpus `01-emphasis-6`),
because the opening `/` is at line start and the inner slashes are literal
content. An intraword path fragment like `a/b/c` stays literal because the `/`
is alphanumeric-flanked and cannot open; `x /a/b y` stays literal because the
closing `/` is followed by an alphanumeric (corpus `01-emphasis-9`).

**Recommendation:** For paths that sit in an emphasizing position, use code
fencing - they're code anyway:

```carve
The config is in `/etc/nginx/nginx.conf` for setup.
Use /italic/ for emphasis.
```

**Examples:**
| Input | Output | Reason |
|-------|--------|--------|
| `/italic/` | *italic* | Valid emphasis |
| `/etc/nginx/` | *etc/nginx* | Also valid (inner `/` is content) |
| `` `/etc/nginx/` `` | `/etc/nginx/` | Code span - recommended for paths |
| `the/path/here` | the/path/here | No whitespace before opener |
| `/ spaced /` | / spaced / | Whitespace after opener - invalid |

**Best practice:** Paths, URLs, and file references should use backticks - they're technical/code content.

---

## 2. Caret `^` Overloading

The `^` character has three meanings:

| Context | Meaning | Example |
|---------|---------|---------|
| Inline | Superscript | `x^2^` |
| Table cell | Rowspan | `\| ^ \|` |
| Line start after block | Caption | `^ Figure 1` |

**Resolution rules:**
1. **Caption:** `^` at line start, immediately after image/quote/table
2. **Rowspan:** `^` as sole content of a table cell (with optional whitespace)
3. **Superscript:** `^text^` inline with content on both sides

**Examples:**
```carve
x^2^ + y^2^ = z^2^           # Superscript

| Category | Item   |
| ^        | Apple  |          # Rowspan (^ is sole cell content)

![Photo](img.jpg)
^ Figure 1: Caption            # Caption (^ at line start after image)

The answer is ^ 42.            # Literal ^ (no closing ^)
```

**Edge case - table cell with just `^2^`:**
```carve
| Value |
| ^2^   |
```
This is superscript "2" in a cell, not rowspan, because `^2^` is a complete superscript span.

---

## 3. Less-than `<` Overloading

| Context | Meaning | Example |
|---------|---------|---------|
| Table cell | Colspan | `\| < \|` |
| Inline | Smart typography | `<-` → ← |
| Autolinks | URL wrapper | `<https://...>` |

**Resolution rules:**
1. **Colspan:** `<` as sole content of a table cell
2. **Autolink:** `<` followed by URL scheme or email pattern
3. **Smart typography:** `<-`, `<->`, `<=` patterns
4. **Literal:** Everything else

**Examples:**
```carve
| Header | <       |           # Colspan

<https://example.com>          # Autolink

The arrow points <- that way   # Smart typography (←)

if (x < 5)                     # Literal <
```

---

## 4. Asterisk `*` Contexts

| Context | Meaning | Example |
|---------|---------|---------|
| Inline | Bold | `*bold*` |
| Line start | List item | `* item` |
| After `*[` | Abbreviation | `*[HTML]: ...` |

**Resolution rules:**
1. **List:** `*` at line start followed by space
2. **Abbreviation:** `*[` at line start
3. **Bold:** `*text*` with content between asterisks
4. **Literal:** Standalone `*` or escaped `\*`

**Examples:**
```carve
* List item                    # List
*bold text*                    # Bold
*[HTML]: HyperText...          # Abbreviation
5 * 3 = 15                     # Literal (spaces around)
```

**Edge case - bold at line start:**
```carve
*This whole line is bold*
*This is also bold, no closing needed
```
Both are bold, not list items, because `*` is NOT followed by whitespace.

List requires `* ` (asterisk + space). Bold opener requires `*` + non-whitespace.

---

## 5. `@mention` Boundaries

**Problem:** Where does a mention end?

**Resolution rules:**
1. Starts with `@` followed by alphanumeric
2. Continues with alphanumeric, `_`, `-`
3. Ends at whitespace, punctuation (except `_-`), or end of line

**Examples:**
| Input | Mention | Remainder |
|-------|---------|-----------|
| `@john` | `@john` | - |
| `@john-doe` | `@john-doe` | - |
| `@john_doe` | `@john_doe` | - |
| `@john.` | `@john` | `.` |
| `@john's` | `@john` | `'s` |
| `@john!` | `@john` | `!` |
| `email@domain.com` | - | (not a mention, no word boundary before @) |

---

## 6. `#tag` vs Headings

| Context | Meaning | Example |
|---------|---------|---------|
| Line start | Heading | `# Heading` |
| Inline | Tag | `#project-x` |

**Resolution rules:**
1. **Heading:** `#` at line start, followed by space, then text
2. **Tag:** `#` preceded by whitespace or start of inline content, followed by alphanumeric

**Examples:**
```carve
# Heading 1                    # Heading

Check out #project-x           # Tag

Issue #123                     # Tag (or could be literal, configurable)

#notaheading                   # Tag (no space after #)
```

---

## 7. Abbreviation `*[` vs Bold

**Problem:** `*[` could start bold with a link inside.

```carve
*[HTML]: HyperText Markup Language    # Abbreviation definition
*[link text](url)* more text          # Bold containing a link
```

**Resolution rules:**
1. **Abbreviation:** `*[` at line start, followed by `WORD]:` pattern
2. **Bold with link:** `*[` inline, link syntax inside, closed with `*`

**Examples:**
```carve
*[HTML]: HyperText Markup Language
# → Abbreviation (line start, ]: pattern)

See *[the docs](url) for more* info
# → Bold span containing a link
```

---

## 8. Nested Emphasis

**Rule:** Same-type nesting is invalid. Different-type nesting is valid.

```carve
/This /does not/ nest/         # Invalid - ambiguous
/This *does* nest/             # Valid: italic with bold inside
*Bold with /italic/ inside*    # Valid
/*Bold italic*/                # Valid: combined
```

**Parsing:** An opener matches a valid closer of the same type (a delimiter
closes only when not preceded by whitespace, see §1). Same-type delimiters
*inside* the span are literal content — same-type spans do not nest — so
`/usr/local/` is `<em>usr/local</em>`, not `<em>usr</em>local/`. Different-type
spans nest fully (`*Bold with /italic/ inside*`). Resolution uses a delimiter
stack in a single left-to-right pass: linear time, no backtracking.

> This is *not* "shortest span / first match wins" — that rule would truncate
> `/usr/local/` to `<em>usr</em>` and break nested emphasis. The ambiguous form
> `/This /does not/ nest/` is discouraged (use code spans for paths, §1); its
> exact output is intentionally unspecified. See grammar.ebnf PART 8
> (Disambiguation rule) and PART 9 §9.

---

## 9. Table Cells with Special Characters

**Problem:** Pipes and other characters in cell content.

```carve
| Command | Description |
| `ls | grep foo` | Filter output |
| Price | $50 \| $100 |
```

**Resolution rules:**
1. Code spans (backticks) protect content
2. Backslash escapes pipe: `\|`
3. Pipes inside inline elements (code, links) are protected

---

## 10. Comments (`%%` and `%%%`)

**Line comments:**
- `%%` must be at **line start** (possibly indented)
- Rest of line is ignored
- Inline `%%` in text is literal: `The value is 50%% increase` → literal text

**Block comments:**
- `%%%` must be on **its own line** to open/close
- Content can contain anything except the same-length delimiter
- Use more `%` to nest: `%%%%` can contain `%%%`

**Examples:**
```carve
%% This is a comment

Text with 50%% is not a comment (not at line start).

%%%
Block comment with %% inside is fine.
%%%
```

**In code blocks:** `%%` and `%%%` are literal (code blocks protect everything).

---

## 11. Code Blocks Override Everything

Content inside code spans and code blocks is **never** parsed for Carve syntax.

~~~carve
```python
# This is not a Carve heading
*this* is not bold
/path/to/file is just text
```

Inline `*not bold*` and `/not/italic/` are literal.
~~~

---

## 12. Caption Timing

**Problem:** When does `^` become a caption vs superscript?

**Rules:**
1. Caption `^` must be at **line start**
2. Must **immediately follow** an image, blockquote, or table
3. Blank line allowed between block and caption (for readability)

```carve
![Photo](img.jpg)
^ This is a caption

![Photo](img.jpg)

^ This is also a caption (blank line OK)

![Photo](img.jpg)
Some other text
^ This is NOT a caption (intervening content)
```

---

## 13. The Three Faces of `+`

**Note:** `+` is **not** a Carve bullet (unlike Markdown/Djot). Carve bullets are `-` and `*` only; `+` is reserved for two unrelated continuation roles plus plain text.

```carve
- item
+                              # List-continuation marker (lone +): attaches
> note                         #   the following flush-left block to `item`

| Cell |
+ cont |                       # Table continuation (+ line WITH pipe structure)

+ not a bullet                 # Plain paragraph text (+ then content, no pipe)
```

**Resolution:**
- A **lone** `+` at the list marker column is the list-continuation marker
- A `+ ... |` line (pipe structure) is a table continuation
- Any other `+ x` line is ordinary paragraph text — `+` never starts a list

---

## 14. Escaping

Backslash escapes any ASCII punctuation:

```carve
\*literal asterisks\*
\/not italic\/
\@not-a-mention
\#not-a-tag
\^ not superscript
```

Inside code spans, backslash is literal:
```carve
`\*still has backslash\*`
```

---

## 15. Smart Typography Conflicts

| Pattern | Output | Could conflict with |
|---------|--------|---------------------|
| `--` | – (en-dash) | Strikethrough delimiter start? No, `~` is used |
| `---` | — (em-dash) | Horizontal rule? Only at line start alone |
| `...` | … (ellipsis) | Nothing |
| `->` | → | Nothing |
| `<-` | ← | Less-than? Requires full pattern |
| `<=` | ≤ | Less-than-equal? Yes, context-dependent |

**Resolution:** Smart typography only applies to specific patterns, not partial matches.

---

## 16. Empty/Whitespace-Only Elements

```carve
**               # Not bold (no content)
//               # Not italic (no content between //)
^^               # Not superscript
||               # Empty table cells (valid)
```

**Rule:** Emphasis requires non-whitespace content between delimiters.

---

## 17. Block Openers Interrupt Paragraphs (Paragraph Interruption)

**Rule:** a **visible** block interrupts an open paragraph with no blank line
before it, at the document top level **and** inside nested content (list item,
block quote, admonition/div body). A continuation line that begins a block is
parsed as that block; the paragraph ends on the line before it. This is the
Markdown-like rule (CommonMark "a paragraph can be interrupted"), and the key
block-level divergence from Djot: in Djot an open paragraph runs until a blank
line, so a `-` / `#` / `>` / `|` line stays paragraph text; in Carve that line
starts the block.

```carve
Die Frage ist x = 5
* 3 + 17 wahr.
```

This is a **paragraph plus a list** (`* 3 + 17 wahr.` begins with a
bullet-plus-space). That is the accepted trade-off: a hard-wrapped prose line
that happens to start with a marker becomes a block. Insert a blank line, or
backslash-escape the marker (`\* 3 + 17`), to keep it prose.

**Three carve-outs** keep common prose safe:

1. **Ordered lists never interrupt** — no ordered marker (`1.`, `2.`, `1985.`,
   `a.`, `i.`) interrupts; an ordered list needs a blank line before it. Allowing
   it would require the CommonMark `1.`-only heuristic Djot removed, so Carve
   keeps ordered lists on the blank-line rule and drops the heuristic entirely.
2. **Closer lookahead** — a fence (`` ``` ``/`~~~`) or `:::` interrupts only
   when a matching closer exists ahead. An unterminated opener stays paragraph
   text, so a stray marker never swallows the rest of the block.
3. **Image excluded** — a bare image `![alt](url)` is inline content, not a
   block, so it renders inside the paragraph.

**Invisible constructs** (link/footnote/abbreviation reference definitions,
`%%`/`%%%` comments) interrupt with no blank line, as they always have — they
produce no block of their own, so they are collected/consumed.

| Input | Result | Reason |
|-------|--------|--------|
| `Text` / `- a` / `- b` | paragraph + list | bullet interrupts |
| `Text` / `# H` | paragraph + heading | heading interrupts |
| `Text` / `` ``` `` / `code` / `` ``` `` | paragraph + code block | fence with a closer interrupts |
| `Text` / `` ``` `` / `code` | one paragraph | unterminated fence — no closer |
| `Text` / `---` / `more` | paragraph + `<hr>` + paragraph | thematic break interrupts |
| `x = 5` / `* 3 + 17` | paragraph + list | accepted false positive |
| `Text` / `1. a` (or `2. a`, `1985. a`) | one paragraph | ordered lists never interrupt |
| `Text` / `![a](u)` | one paragraph (inline image) | image excluded |
| `See[^m].` / `[^m]: note` | paragraph + endnotes | invisible construct |
| `> text` / `> # H` | quote: paragraph + heading | interrupts inside the quote |
| `- a` / `  - b` | nested sublist | indented sublist still nests |
| `- text` / `  # H` | item: text + heading | interrupts inside the item |

Normative statement: `resources/grammar.ebnf` PART 9 §10. Verified by corpus
`05-lists-6`, `05-lists-7`, and the `Paragraph interruption` section.

---

## Summary: Parser Priority

When multiple interpretations are possible, use this order:

1. **Code spans/blocks** - Highest priority, content is literal
2. **Escapes** - `\x` makes `x` literal
3. **Block-level constructs** - Headings, lists, tables, code blocks
4. **Captions** - `^` at line start after captionable block
5. **Autolinks** - `<url>` pattern
6. **Links/Images** - `[text](url)`, `![alt](src)`
7. **Emphasis** - `/italic/`, `*bold*`, etc.
8. **Smart typography** - `--`, `->`, etc.
9. **Extensions** - `@mention`, `#tag`, `:type[content]`
10. **Plain text** - Everything else
