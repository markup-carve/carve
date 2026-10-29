## A generic extension parses its captured content as inline content

The generic span renders parsed inline children. An empty captured run renders
an empty span.

::: compare

```carve
:code[*b*] :foo[]
```

```html
<p><span class="ext-code"><strong>b</strong></span> <span class="ext-foo"></span></p>
```

:::

::: compare

```carve
:foo[/a *b*/]
```

```html
<p><span class="ext-foo"><em>a <strong>b</strong></em></span></p>
```

:::

::: compare

```carve
> :foo[*b*] and @ann
```

```html
<blockquote><p><span class="ext-foo"><strong>b</strong></span> and <span class="mention"><strong>@ann</strong></span></p></blockquote>
```

:::
