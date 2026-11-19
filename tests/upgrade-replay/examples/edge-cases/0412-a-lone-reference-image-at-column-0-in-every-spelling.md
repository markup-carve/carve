## A lone reference image at column 0, in every spelling

`411-a-lone-indented-image-is-a-paragraph-and-its-html-cannot-say-so` pins what an
INDENTED lone image is (carve#1660). This section pins the SPELLING axis at column
0, where nothing was pinned at all: no document in the corpus held a lone
reference image at column 0, so the question of whether the reference spellings
reach block position had no answer on the record and two readings could stand
(carve#1663).

All three engines AGREE here, and these pairs record that rather than argue for
it. On the published tree - the one a consumer receives - the direct spelling and
both reference spellings are a top-level `image`, and an unresolved reference is a
`paragraph`:

| source | published shape |
| --- | --- |
| `![Apollo](a.jpg)` | `image` |
| `![Apollo][moon]`, with `[moon]: a.jpg` | `image` |
| `![Apollo][]`, with `[Apollo]: a.jpg` | `image` |
| `![Apollo][nope]`, undefined | `paragraph` holding an `image` |

READ THE PUBLISHED EXIT, NOT THE PARSE TREE, when checking any of this. carve-js
promotes inside `resolve()` rather than in its syntactic block-image pass, and
`resolve()` mutates the tree in place - so `parse()` reports a `paragraph` for the
middle two rows and the tree a consumer receives holds an `image`. Comparing that
intermediate stage against engines that resolve inside their own parse compares a
stage no other engine exposes; `scripts/ast-conformance.mjs` names the trap in its
own source, from carve#486, and takes its reference tree through
`toAstJson(resolve(parse(x)))` for exactly this reason. carve#1663 was filed and
ruled on the parse-only reading and withdrawn once the published tree was
measured.

THE HTML CANNOT SEE THE FIRST THREE PAIRS. A paragraph whose whole content is one
image renders as a bare `<img>` with no `<p>` wrapper, so a promoted image and a
paragraph holding one emit the same bytes, and every engine passes these three
whatever it does with the tree. The reader that can tell them apart is the SHAPE
comparison in `npm run ast:check`. The fourth pair is the one the HTML does
report, because a reference that resolves to nothing degrades to the literal
source it was written as.

::: compare

```carve
![Apollo][moon]

[moon]: a.jpg
```

```html
<img src="a.jpg" alt="Apollo">
```

:::

The collapsed spelling resolves by its own derived label and reaches the same
promotion, so it lands the same way.

::: compare

```carve
![Apollo][]

[Apollo]: a.jpg
```

```html
<img src="a.jpg" alt="Apollo">
```

:::

The direct spelling is the one the syntactic block-image pass matches, and it is
here so the three spellings are pinned together rather than one of them being
inferred from the other two.

::: compare

```carve
![Apollo](a.jpg)
```

```html
<img src="a.jpg" alt="Apollo">
```

:::

An unresolved reference stays a paragraph on all three, and this is where the
HTML does move: nothing defines `nope`, so there is no destination and the
construct renders as the text the author typed.

::: compare

```carve
![Apollo][nope]
```

```html
<p>![Apollo][nope]</p>
```

:::
