---
description: How Carve 0.2 differs from related document languages.
---

# Markup languages

Carve, Djot, Markdown, AsciiDoc and reStructuredText all turn readable source into structured documents. They differ in syntax, interchange contracts and tooling. This page compares the forms most relevant to someone reading Carve 0.2. The [0.2 specification](./grammar) is authoritative for Carve; other languages follow their own versions and implementations.

| Task | Carve 0.2 | CommonMark or GFM | Djot |
|---|---|---|---|
| First-level heading | `= Title` | `# Title` | `# Title` |
| Strong text | `*text*` | `**text**` | `*text*` |
| Emphasis | `/text/` | `*text*` | `_text_` |
| Link | `[text](url)` | `[text](url)` | `[text](url)` |
| Table header | `|= Name |= Qty |` | GFM uses a separator row | Uses a separator row |
| Task item | `- [x] done` | GFM uses `- [x] done` | `- [x] done` |

Carve 0.2 also defines [AST 2.0](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md), canonical writing, HTML import and a common CLI contract. A familiar spelling does not guarantee the same parse: container ownership, delimiter pairing and fallback rules belong to each language's specification.

## Choosing a format

Use the format required by the system that will publish or edit the document. For existing Markdown, the 0.2 reference engine's migration path uses the [HTML import hub](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md) and its engine-specific import helpers. Review the [upgrade guide](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md) before converting 0.1 Carve documents. For a new Carve implementation, start with [Implementing Carve](./implementing-carve).
