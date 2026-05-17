# Parsing & AST

## Part 5: Parsing Rules

### 5.1 Block Identification (First Pass)

1. Frontmatter (`---` delimited at document start)
2. Headings (`#` prefix)
3. Thematic breaks (`---`, `***`, `___`)
4. Code blocks (``` ` ``` ` ``` or `~~~` fenced)
5. Block quotes (`>` prefix)
6. Lists (`-`, `*`, `+`, or `1.` prefix)
7. Tables (`|` prefix)
8. Special blocks (`:::` delimited)
9. Paragraphs (everything else)

### 5.2 Inline Parsing (Second Pass)

Parse in this precedence order:
1. Escaped characters (`\*`)
2. Code spans (`` ` ``)
3. Autolinks (`<url>` and bare URLs)
4. Links and images (`[text](url)`, `![alt](src)`)
5. Math (`$...$`)
6. Emphasis markers (`/`, `*`, `_`, `~`, `^`, `==`)
7. Smart typography

### 5.3 The Disambiguation Rule

When ambiguous, prefer:
1. Literal text over markup
2. Shorter spans over longer
3. Earlier opening over later

Example: `*a *b* c*` parses as `*a ` + bold(b) + ` c*` (literal asterisks around)

### 5.4 Whitespace Rules

- Line ending = soft break (default, configurable)
- Blank line = paragraph break
- Two+ blank lines = paragraph break with extra space (optional)
- Indentation: 2+ spaces for list continuation
- Tabs: Normalized to spaces (default: 4)

---

## Part 6: AST Design

### 6.1 Node Types

```
Document
├── Frontmatter (optional)
├── Block+
    ├── Heading { level, content, id? }
    ├── Paragraph { content }
    ├── CodeBlock { language?, content, attributes }
    ├── BlockQuote { blocks, attribution? }
    ├── List { type, tight, items }
    │   └── ListItem { blocks, checked? }
    ├── Table { headers, rows, alignment[] }
    ├── ThematicBreak
    ├── Admonition { type, title?, blocks }
    └── RawBlock { format, content }

Inline
├── Text { content }
├── Emphasis { content }           // /text/
├── Strong { content }             // *text*
├── Underline { content }          // _text_
├── Strikethrough { content }      // ~text~
├── Superscript { content }        // ^text^
├── Subscript { content }          // ,,text,,
├── Highlight { content }          // ==text==
├── Code { content, language? }
├── Math { content, display }
├── Link { content, url, title? }
├── Image { src, alt, caption? }
├── Footnote { content }
├── SoftBreak
├── HardBreak
└── RawInline { format, content }
```

(`id` is optional in the parsed AST but always populated after the
identifier-resolution pass — automatic or explicit — so consumers
downstream of resolution can treat it as required.)

### 6.2 Source Mapping

Every node includes:
```
position: {
  start: { line, column, offset }
  end: { line, column, offset }
}
```

---

