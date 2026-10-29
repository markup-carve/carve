## A derived title yields to an authored one

`abbr` and `time` values become `title` and `datetime`, which are ordinary
attribute names an author may also write. Where both are present the authored
one wins - one element never carries the same attribute twice (PART 9 §9).

::: compare

```carve
[x]{abbr="derived" title="authored"} [y]{time="2026" datetime="custom"}
```

```html
<p><abbr title="authored">x</abbr> <time datetime="custom">y</time></p>
```

:::

Without an authored one the derived attribute is what the element carries.

::: compare

```carve
[HTML]{abbr="HyperText Markup Language"}
```

```html
<p><abbr title="HyperText Markup Language">HTML</abbr></p>
```

:::
