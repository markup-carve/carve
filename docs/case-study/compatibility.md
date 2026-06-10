# Compatibility, Comparison & Open Questions

## Part 7: Compatibility and Migration

### 7.1 Migration Warnings

Parser can emit warnings for Markdown-specific syntax:
```
Line 15: Double-asterisk bold **text** detected
         Suggestion: *text*

Line 23: Single-asterisk emphasis *text* detected
         Suggestion: /text/

Line 31: `+` bullet detected — not a Carve bullet (it is the
         list-continuation marker), so this line renders as a paragraph
         Suggestion: -
```

### 7.2 Auto-Migration Tool

```bash
carve migrate input.md --from markdown --to carve > output.crv
```

### 7.3 Compatibility Modes (proposed)

> Design proposal — `carve-compat` is not part of the current grammar or
> corpus; it is sketched here as a possible future direction.

```
---
carve-compat: markdown
---
```

Modes:
- `strict` - Only Carve syntax (default)
- `markdown` - Accept Markdown syntax with warnings
- `djot` - Accept Djot syntax with warnings

---

## Part 8: Comparison Matrix

### 8.1 Syntax Comparison

| Feature          | Markdown    | Djot        | rST           | AsciiDoc     | Org         | Carve         |
|------------------|-------------|-------------|---------------|--------------|-------------|--------------|
| Italic           | `*t*`/`_t_` | `_t_`       | `*t*`         | `_t_`        | `/t/`       | `/t/`        |
| Bold             | `**t**`     | `*t*`       | `**t**`       | `*t*`        | `*t*`       | `*t*`        |
| Underline        | N/A         | N/A         | N/A           | `[.underline]#t#` | `_t_` | `_t_`        |
| Strikethrough    | `~~t~~`     | N/A         | N/A           | `[.line-through]#t#` | `+t+` | `~t~`   |
| Links            | `[t](u)`    | `[t](u)`    | `` `t <u>`_ ``| `u[t]`       | `[[u][t]]`  | `[t](u)`     |
| Images           | `![a](u)`   | `![a](u)`   | directive     | `image::u[]` | `[[u]]`     | `![a](u)`    |
| Attributes       | N/A         | `{.c #i}`   | roles         | `[attrs]`    | `#+ATTR`    | `{.c #i}`    |
| Table headers    | `---`       | `---`       | underline     | `|===`       | `\|---+`    | `\|=`        |
| Admonitions      | N/A         | `::: class` | `.. type::`   | `TYPE:`      | N/A         | `:::type`    |
| Code fence       | ``` ` ```   | ``` ` ```   | `::`          | `----`       | `#+BEGIN`   | ``` ` ```    |
| Bullet markers   | `-`/`*`/`+` | `-`/`*`/`+` | `-`/`*`/`+`   | `*`          | `-`/`+`     | `-`/`*`      |

**Notes on the Djot column:**

- **Bullet markers:** Markdown, Djot and rST all accept `+` as a bullet; Carve does **not**. Carve bullets are `-` and `*` only — `+` is reserved as the list-continuation marker (a lone `+` attaches a following block to the current item). A Markdown/Djot `+` bullet therefore renders as a paragraph in Carve; the auto-migration tool rewrites it to `-`, and `djotMigrationWarnings` flags it.
- **Underline:** Djot has no underline element; `{+ +}` is *insert* (`<ins>`), browser-underlined by default.
- **Strikethrough:** Djot has no strikethrough. `~t~` is Djot *subscript*; the closest struck-out element is *delete* `{-t-}` (`<del>`). Carve's `~t~` strikethrough therefore collides with Djot subscript — see migration warnings.
- **Admonitions:** Djot has only generic divs (`:::` + a class). Named/styled admonition *types* are renderer-defined, not built into the Djot spec.

### 8.2 Learning Curve

| Format    | 5 min | 1 hour | 1 day | Mastery |
|-----------|-------|--------|-------|---------|
| Gemtext   | 100%  | 100%   | 100%  | 100%    |
| Markdown  | 60%   | 80%    | 90%   | Never*  |
| Carve      | 70%   | 90%    | 95%   | 98%     |
| Djot      | 50%   | 85%    | 95%   | 98%     |
| AsciiDoc  | 40%   | 70%    | 85%   | 95%     |
| rST       | 30%   | 60%    | 80%   | 95%     |
| Org-mode  | 20%   | 50%    | 70%   | 90%     |

*Markdown: Never 100% due to ambiguities and variants

---


## Part 10: Open Questions and Trade-offs

### 10.1 Emphasis Character Choice

**Option A (Current):** `/italic/`, `*bold*`
- Pro: Visual mnemonics
- Con: `/` is common in URLs, paths

**Option B:** `_italic_`, `*bold*` (like Djot)
- Pro: Familiar to Djot/AsciiDoc users
- Con: `_` underscore used for underline in Carve

**Option C:** `~italic~`, `*bold*`, `-underline-`
- Pro: Different associations
- Con: `~` is strikethrough in many systems

**Current Decision:** Option A, with smart parsing to avoid path conflicts.

### 10.2 Link Syntax

**Decision:** Standard `[text](url)` for all links.

Considered alternatives:
- `"text"(url)` - Natural reading order, but quotes conflict with code strings
- `[text -> url]` - Arrow suggests direction, but different from all formats
- `[[url | text]]` - Wiki-style, but ambiguous with nested spans

For wiki-style internal links, use collapsed reference `[Page Name][]` which
processors resolve to appropriate URLs.

### 10.3 Code Block Delimiters

**Decision:** Keep triple backtick (` ``` `)
- Universal across Markdown, Djot, GitHub, etc.
- Syntax highlighting support everywhere
- No learning curve - users already know it
- Alternative `~~~` also accepted for edge cases

Don't fix what isn't broken.

### 10.4 Attribute Syntax

**Decision:** Keep Djot's `{.class #id key=value}`

- Already proven and familiar to Djot users
- Frees `@` for mentions (social media expectation)
- Attributes are a power feature - slight verbosity is acceptable
- No ambiguity with other syntax

The temptation to use `@` for attributes was wrong - `@user` for mentions
is too deeply ingrained from Twitter/Instagram/GitHub.

### 10.5 Table Complexity

How complex should tables get?
- Cell merging (rowspan, colspan)
- Nested tables
- Multi-line cells

**Decision:** Support colspan (`||`), multi-line via `\`, recommend separate list for complex data.

### 10.6 Versioning Strategy

```
---
carve-version: 1.0
---
```

Parsers should:
1. Parse any version they understand
2. Warn on unknown versions
3. Fail gracefully on incompatible versions

---

