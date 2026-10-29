## A frontmatter opener takes exactly one space

`frontmatter_open = "---", [space], [frontmatter_format]` spells its slot as
exactly one character too. With two, the second space reaches
`frontmatter_format = (letter | digit)+`, which cannot match it, so the line is
not a typed opener.

What is left is not a thematic break either -- a break is a dash run and
nothing else -- so the line is ordinary paragraph text, the metadata lines fold
into it as lazy continuation, and the closing `---` is the thematic break. The
opening dashes are then subject to smart typography like any other text, which
is why they render as an em dash.

::: compare

```carve
---  yaml
title: T
---

body
```

```html
<p>—  yaml
title: T</p>
<hr>
<p>body</p>
```

:::

The CONTROL. One space is the lenient spelling and still opens frontmatter,
which renders nothing:

::: compare

```carve
--- yaml
title: T
---

body
```

```html
<p>body</p>
```

:::
