## A caption's placeholder is any `#` that does not begin a tag

CARVE-P2-022 calls the first bare `#` in a caption's top-level text the number
placeholder, and bare is "a `#` that does NOT begin a tag": one followed by
whitespace, `:`, `.`, the caption's end, or any character a tag name does not
take. A tag name takes letters, digits, `_` and `-`, so every other character
leaves the `#` bare (markup-carve/carve#2165).

::: compare

```carve
![p](p.png)
^ Figure #* q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure 1* q</figcaption>
</figure>
```

:::

::: compare

```carve
![p](p.png)
^ Figure #, q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure 1, q</figcaption>
</figure>
```

:::

::: compare

```carve
![p](p.png)
^ Figure ## q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure 1# q</figcaption>
</figure>
```

:::

::: compare

```carve
![p](p.png)
^ Figure #é q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure 1é q</figcaption>
</figure>
```

:::

A `#` glued to digits begins no tag, because a tag name needs a letter (carve#4809), and a `#` before a tag-name character is never the placeholder (carve#4642), so `#1` stays text.

::: compare

```carve
![p](p.png)
^ Figure #1 q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure #1 q</figcaption>
</figure>
```

:::

::: compare

```carve
![p](p.png)
^ Figure #-a q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure <span class="tag"><strong>#-a</strong></span> q</figcaption>
</figure>
```

:::

Only the first bare `#` is the placeholder.

::: compare

```carve
![p](p.png)
^ Figure x #* y #: z
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure x 1* y #: z</figcaption>
</figure>
```

:::

A `#` glued to the word before it is still bare when a tag name cannot follow.

::: compare

```carve
![p](p.png)
^ Figure#* q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure1* q</figcaption>
</figure>
```

:::

CONTROL. With a tag name after it the `#` is glued into the word instead.

::: compare

```carve
![p](p.png)
^ Figure x#tag q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure x#tag q</figcaption>
</figure>
```

:::
