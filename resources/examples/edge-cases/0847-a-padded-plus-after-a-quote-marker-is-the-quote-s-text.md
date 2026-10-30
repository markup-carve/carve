---
page: edge-lists
---

## A padded plus after a quote marker is the quote's text

A quote's `+` takes one space after the marker. With more padding it is the quote's text, in a quote on an item's marker line as much as in one at document level, so the block below it stays where its own column puts it.

::: compare

```carve
- >  +
# H
```

```html
<ul>
  <li>
    <blockquote><p>+</p></blockquote>
  </li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

:::

A prefixed line is a new quote at its own column, not a line of the item's.

::: compare

```carve
- >  +
> q
```

```html
<ul>
  <li>
    <blockquote><p>+</p></blockquote>
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

At an enclosing quote's column it folds like a letter.

::: compare

```carve
> >  +
  s
```

```html
<blockquote>
  <blockquote><p>+
s</p></blockquote>
</blockquote>
```

:::
