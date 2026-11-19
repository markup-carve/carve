## All-space verbatim content

The single-space strip on a verbatim span (PART 3 `code_span`) drops one leading and one trailing space, but *not* when the content consists entirely of space characters - those spans keep every space. Without this guard a formatter round-trip loses the content, since a span stripped to empty has no writable source spelling.

::: compare

```carve
A single space ` ` and two spaces `  ` are preserved.
```

```html
<p>A single space <code> </code> and two spaces <code>  </code> are preserved.</p>
```

:::

Ordinary content still strips one space from each side, so the guard is narrow.

::: compare

```carve
But ` a ` strips one space from each side.
```

```html
<p>But <code>a</code> strips one space from each side.</p>
```

:::

The sigil-prefixed verbatim forms - the inline literal (section 27) and math (section 18) - share the same strip rule, so they keep all-space content too.

::: compare

```carve
Literal !`  ` and math $`  ` keep their spaces.
```

```html
<p>Literal    and math <span class="math inline" role="math">\(  \)</span> keep their spaces.</p>
```

:::
