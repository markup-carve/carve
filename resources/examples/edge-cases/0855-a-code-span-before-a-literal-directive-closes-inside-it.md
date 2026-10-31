---
page: edge-inline
---

## A code span before a literal directive closes inside it

A literal directive is no atom (CARVE-P9-043), so a code span opened before it closes at a run inside it, as a delimiter span does.

::: compare

```carve
`a *{{ `@lines:1 }}*
```

```html
<p><code>a *{{ </code><span class="mention"><strong>@lines</strong></span>:1 }}*</p>
```

:::

A code span around the whole directive stays one span.

::: compare

```carve
`{{ a @lines:0 }}`
```

```html
<p><code>{{ a @lines:0 }}</code></p>
```

:::
