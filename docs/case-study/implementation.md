---
description: How the reference parser was built, and what the first implementation taught us.
---

# Implementation & Reflection

## Part 9: Implementation Considerations

### 9.1 Parser Architecture

1. **Lexer**: Stream of tokens (block markers, inline markers, text)
2. **Block Parser**: Resolves block structure before any inline parsing, as in
   Djot. (Djot's spec does not use the term "two-pass"; it guarantees that block
   structure is determined first and that reference resolution is
   order-independent. See Design Principles 1–2.)
3. **Inline Parser**: Parses inline content within blocks
4. **AST Builder**: Constructs typed AST nodes
5. **Renderer**: Transforms AST to output format

### 9.2 Reference Implementations

JavaScript/TypeScript, Rust, and PHP implementations exist (carve-js, carve-rs,
carve-php) and use the shared conformance corpus. See the [Ecosystem](../ecosystem)
for current bindings and integrations.

### 9.3 Editor Support Essentials

- Syntax highlighting rules (TextMate grammars)
- LSP server for validation and completion
- Tree-sitter grammar for structural editing
- Preview rendering (HTML output)

---


## Part 12: Conclusion

### 12.1 Carve's Key Innovations

1. **Visual Mnemonics**: `/slant/` for italic, `*heavy*` for bold
2. **Simpler Tables**: `|=` headers, no separator rows needed
3. **Optional Mentions**: configured templates can resolve `@user` and `#tag`
4. **Extension System**: `:type[content]{attrs}` for custom elements
5. **Distinct Markers**: Prefer different notation for different constructs
6. **Djot Foundation**: Inherits rigorous parsing and attributes

### 12.2 Design Goals

The goals were:
- Non-technical users can write without consulting docs
- Technical users can access full power when needed
- Documents remain readable as plain text
- Parsing is deterministic and fast
- Migration from Markdown has a documented path

### 12.3 Next Steps (as written at the time)

1. Formalize EBNF grammar
2. Build reference parser in TypeScript
3. User testing with non-technical writers
4. Iterate on problem areas
5. Editor integration (VS Code, Obsidian, etc.)
6. Documentation and tutorials

The [formal grammar](../grammar), implementations, and documentation are
available. The implementations use a shared
[conformance corpus](https://github.com/markup-carve/carve/tree/main/tests/corpus).
See the [Ecosystem](../ecosystem) for current editor support and bindings. These
notes present no results from the proposed user testing.

---

*This case study is a historical record of early design notes. The normative
definition of the language is the [formal grammar](../grammar) and the
conformance corpus.*

*Feedback and contributions welcome at <https://github.com/markup-carve>.*

---
