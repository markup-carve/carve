## Single-line headings

A heading **ends at the newline**. Nothing folds into it: the next line begins whatever block it begins, exactly as after any other closed block. This diverges from djot deliberately — djot folds a following plain line into the heading, which is a silent corruption for anyone arriving from Markdown, and `divergence-from-djot` §7 already broke from djot on the mirror case. A `^ …` caption line is no exception: it does not fold in, and it does not attach either, because a heading is not one of §4's captionable hosts - it opens an ordinary paragraph. The heading id is built from the single line. (Setext underline headings remain intentionally excluded.)

::: compare

```carve
# Title
outside
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>outside</p>
</section>
```

:::

Repeated headings are simply separate headings — the `#` count no longer decides whether one folds into another.

::: compare

```carve
## A
## still A
# B
```

```html
<section id="A">
  <h2>A</h2>
</section>
<section id="still-A">
  <h2>still A</h2>
</section>
<section id="B">
  <h1>B</h1>
</section>
```

:::

A list marker — bullet or ordered — ends the heading and starts a sibling list.

::: compare

```carve
# Title
- item
```

```html
<section id="Title">
  <h1>Title</h1>
  <ul>
    <li>item</li>
  </ul>
</section>
```

:::

An ordered marker ends the heading the same way (symmetric with the bullet).

::: compare

```carve
# Title
1. one
```

```html
<section id="Title">
  <h1>Title</h1>
  <ol>
    <li>one</li>
  </ol>
</section>
```

:::

A marker followed by whitespace only is not a heading — the content after the
required space must carry at least one non-whitespace character, so the trailing
spaces leave the line as paragraph text.

::: compare

```carve
#  
```

```html
<p>#</p>
```

:::

A trailing hash run is heading text. The Markdown target escapes the run's first `#` so a CommonMark reader does not strip it as a closing sequence (PART 11 §8a M1f).

::: compare

```carve
# a ##
```

```html
<section id="a">
  <h1>a ##</h1>
</section>
```

:::

A single trailing hash is a run of one.

::: compare

```carve
# a #
```

```html
<section id="a">
  <h1>a #</h1>
</section>
```

:::

Only the trailing run closes a Markdown heading, so a run with text after it stays bare.

::: compare

```carve
# a ### b ###
```

```html
<section id="a-b">
  <h1>a ### b ###</h1>
</section>
```

:::

The run has no length limit.

::: compare

```carve
# a #######
```

```html
<section id="a">
  <h1>a #######</h1>
</section>
```

:::

A heading inside a container is a heading line too.

::: compare

```carve
> - a
>
>   ### b ###
```

```html
<blockquote>
  <ul>
    <li>a
      <h3 id="b">b ###</h3>
    </li>
  </ul>
</blockquote>
```

:::
