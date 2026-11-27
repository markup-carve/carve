---
title: "Explicit same-kind emphasis nesting"
description: "Specification change, compatibility examples, and acceptance cases for nested braced emphasis."
---

# Explicit Same-Kind Emphasis Nesting

Carve 0.2 pairs emphasis delimiters on one stack. A bare slash marks emphasis and a bare star marks strong text. Braced pairs can force a boundary where bare punctuation would be ambiguous. See [emphasis and strong](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#emphasis-and-strong) and [braced delimiters](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#braced-delimiters).

```crv
{*outer {*inner*} outer*}

{/outer {/inner/} outer/}
```

The braced opener and closer each carry their own mark. They do not pair with a bare delimiter. The nearest open braced pair of the same kind closes first; any intervening unclosed opener becomes text under the stack rule.

Use explicit braces when a nested span must be visible to a reader of the source. Run `carve fmt --check` on the finished file. The canonical writer may choose another spelling for the same tree; see [writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#canonical-forms-inline).
