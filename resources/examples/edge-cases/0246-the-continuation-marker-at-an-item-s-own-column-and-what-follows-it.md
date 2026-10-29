## The continuation marker at an item's own column, and what follows it

§17's `+` continuation marker was pinned by the corpus in one shape only: a marker at column 0 with a BLOCK after it. Both axes it varies - where the marker sits, and what kind of thing follows - were unreached, and each hid a live divergence until someone measured it by hand (carve#812).

An INDENTED `+` is not consumed as a marker, so it survives as text in the item, and a definition below it is still collected:

::: compare

```carve
- a
  +
  [r]: /u

see [t][r]
```

```html
<ul>
  <li>a
+</li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::

The same indented `+` with nothing attached stays in the item it was written in, rather than starting a block of its own:

::: compare

```carve
- a
  +

x
```

```html
<ul>
  <li>a
+</li>
</ul>
<p>x</p>
```

:::

A PARAGRAPH attached by a column-0 `+` is the shape the marker most obviously serves, and the corpus pinned only non-paragraph blocks - a fenced code block and a block quote - on which the engines had always agreed. Attached paragraph text is bare, not wrapped in its own `<p>`:

::: compare

```carve
- a
+
b

x
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
<p>x</p>
```

:::
