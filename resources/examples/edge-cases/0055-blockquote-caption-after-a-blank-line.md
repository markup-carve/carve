## Blockquote caption after a blank line

One blank line is allowed between a block and its `^` caption; the
quote becomes a `<figure>` with a `<figcaption>`.

::: compare

```carve
> quote text

^ Source: Someone
```

```html
<figure>
  <blockquote><p>quote text</p></blockquote>
  <figcaption>Source: Someone</figcaption>
</figure>
```

:::
