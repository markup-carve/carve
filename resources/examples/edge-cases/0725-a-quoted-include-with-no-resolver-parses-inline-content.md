## A quoted include with no resolver parses inline content

::: compare

```carve
{{ "a}}b" @code }}
```

```html
<p>{{ “a}}b” <span class="mention"><strong>@code</strong></span> }}</p>
```

:::
