---
description: The affirmative case for a new language, and the negative case against extending Markdown.
---

# Design

_Both the affirmative case (what we chose) and the negative case (why we didn't just extend Markdown)._

## Part 3: Carve Design Principles

### 3.1 Core Principles

1. **Distinct syntax** - Prefer different markers for different constructs
2. **Visual mnemonics** - Syntax resembles output
3. **Progressive disclosure** - Common constructs come first; advanced ones remain available
4. **Natural language order** - Read left-to-right logically
5. **Graceful degradation** - Plain text remains readable
6. **Keyboard-friendly** - Common operations use common keys
7. **Visible syntax** - Avoid significant trailing spaces

### 3.2 Anti-Patterns to Avoid

- Double characters for "stronger" (`**bold**`) - not intuitive
- Asymmetric syntax (`[text](url)` vs `![alt](url)`)
- Significant trailing whitespace
- Context-dependent parsing
- Same delimiter, count-dependent meaning (`*` vs `**` for emphasis vs strong)

---


## Part 11: Why Not Just Fix Markdown?

### 11.1 The Backward Compatibility Trap

Markdown's installed base makes syntax changes expensive. A change can alter
existing documents, and implementations may adopt it at different times.

### 11.2 Relationship to Djot

Djot gives Carve a parsing model and attributes. Carve changes some surface
choices, including emphasis, subscript, and superscript delimiters, to meet different
readability goals. The [formal grammar](../grammar) defines the current language.

---
