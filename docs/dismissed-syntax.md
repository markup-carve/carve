# Dismissed Syntax Ideas

This page records common spellings that Carve 0.2 does not adopt as core syntax. They can be useful in another language, but a Carve parser reads them under its own rules. The [0.2 block](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md) and [inline](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md) chapters decide the actual reading.

| Proposed spelling | 0.2 form or behavior |
|---|---|
| `**strong**` | A repeated bare star is literal; use `*strong*`. |
| `_emphasis_` | Bare underscore is text; use `/emphasis/`. |
| `~~strike~~` | Bare tilde is text; use `{~strike~}`. |
| `---` as a break | Use `***`; a hyphen run is not a thematic break. |
| Tilde code fences | Use a backtick fence. |
| GFM table separator | Mark header cells with `|=`. |
| `+` as a list continuation | Indent the following block within its owner. |
| Implicit raw HTML | Use an explicit raw form and an enabled host policy. |

Carve also has no general variable or template language in core source. An application can register an extension, but it must preserve a core fallback. See [extensions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md). For an existing 0.1 document, use the [upgrade guide](./upgrade-0-2) rather than a find and replace pass: several unchanged spellings change HTML.
