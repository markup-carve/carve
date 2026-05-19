# Implementation & Reflection

## Part 9: Implementation Considerations

### 9.1 Parser Architecture

1. **Lexer**: Stream of tokens (block markers, inline markers, text)
2. **Block Parser**: Resolves block structure before any inline parsing, as in
   Djot. (Djot's spec does not use the term "two-pass"; it guarantees that block
   structure is determined first and that reference resolution is
   order-independent — see Design Principles 1–2.)
3. **Inline Parser**: Parses inline content within blocks
4. **AST Builder**: Constructs typed AST nodes
5. **Renderer**: Transforms AST to output format

### 9.2 Reference Implementation Priorities

1. JavaScript/TypeScript (web, Node.js ubiquity)
2. Rust (performance, WASM compilation)
3. Python (data science, docs communities)
4. Go (modern backend systems)
5. PHP (existing Djot-PHP could be adapted)

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
3. **Social Mentions**: `@user` and `#tag` work as expected
4. **Extension System**: `:type[content]{attrs}` for custom elements
5. **Unambiguous Rules**: One syntax, one meaning, always
6. **Djot Foundation**: Inherits rigorous parsing and attributes

### 12.2 Success Metrics

Carve succeeds if:
- Non-technical users can write without consulting docs
- Technical users can access full power when needed
- Documents remain readable as plain text
- Parsing is deterministic and fast
- Migration from Markdown is trivial

### 12.3 Next Steps

1. Formalize EBNF grammar
2. Build reference parser in TypeScript
3. User testing with non-technical writers
4. Iterate on problem areas
5. Editor integration (VS Code, Obsidian, etc.)
6. Documentation and tutorials

---

*This is a design exploration, not a finished specification. Real-world testing
with diverse users would be essential before finalizing syntax decisions.*

*Feedback welcome at [hypothetical GitHub repo].*

---

