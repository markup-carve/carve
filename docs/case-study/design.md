# Design

_Both the affirmative case (what we chose) and the negative case (why we didn't just extend Markdown)._

## Part 3: Carve Design Principles

### 3.1 Core Principles

1. **One syntax, one meaning** - Never context-dependent
2. **Visual mnemonics** - Syntax resembles output
3. **Progressive disclosure** - Basic usage is trivial, power features exist
4. **Natural language order** - Read left-to-right logically
5. **Graceful degradation** - Plain text remains readable
6. **Keyboard-friendly** - Common operations use common keys
7. **No invisible syntax** - No trailing spaces, no significant whitespace tricks

### 3.2 Anti-Patterns to Avoid

- Double characters for "stronger" (`**bold**`) - not intuitive
- Asymmetric syntax (`[text](url)` vs `![alt](url)`)
- Significant trailing whitespace
- Context-dependent parsing
- Same delimiter, count-dependent meaning (`*` vs `**` for emphasis vs strong)

---


## Part 11: Why Not Just Fix Markdown?

### 11.1 The Backward Compatibility Trap

Markdown has trillions of documents. Any "fix" must:
- Not break existing documents (impossible for real fixes)
- Be adopted by all implementations (fragmented ecosystem)
- Wait for CommonMark updates (slow process)

### 11.2 Why Djot Isn't Enough

Djot is technically excellent but:
- Designed by a programmer for programmers
- `{.class}` syntax feels like code
- Link syntax unchanged from Markdown
- No visual mnemonics for emphasis

### 11.3 Why Carve Is Needed

Carve takes Djot's technical rigor and adds:
- User research-driven syntax choices
- Visual mnemonics throughout
- Natural language-aligned patterns
- Progressive complexity disclosure

---

