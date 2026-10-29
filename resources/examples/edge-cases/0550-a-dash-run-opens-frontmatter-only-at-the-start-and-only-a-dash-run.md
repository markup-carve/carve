## A dash run opens frontmatter only at the start, and only a dash run

A frontmatter block is a `---` opener and a `---` closer, and both parts carry
weight. A lone marker has no closer, so it stays a thematic break. A pair that
does not begin the document is two breaks. And the other two break markers
never spell frontmatter at all, so a pair of those is two breaks wherever it
sits.

<!--
DELIBERATE MULTI-PAIR COMPARE BLOCK. Do not split it into one block per pair,
and do not collapse it to a single pair.

It is the only block in resources/examples/*.md that holds more than one
`carve` fence, and the fleet's population counters are measured against these
pages. On a page of one-pair blocks a counter that counts blocks and a counter
that counts `carve` fences return the same number, so without this block the
fix in markup-carve/carve#2824 is unwatched and the next hand-written copy of
that counter is wrong and green. That is how it broke the first time: carve#2825
split the five-pair ordered-list delimiter block, and nothing recorded what the
block was holding up.

Guarded by tests/the-example-source-holds-a-multi-pair-compare-block.test.mjs
(markup-carve/carve#2833).
-->

The four spellings below share one block on purpose. This is the example
source's only multi-pair block, and it exists to be counted: the comment above
names what reads it.

::: compare

```carve
---
```

```html
<hr>
```

```carve
---
---

body
```

```html
<p>body</p>
```

```carve
___
___

body
```

```html
<hr>
<hr>
<p>body</p>
```

```carve
x

---
---
```

```html
<p>x</p>
<hr>
<hr>
```

:::
