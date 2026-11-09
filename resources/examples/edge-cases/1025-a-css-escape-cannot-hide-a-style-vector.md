---
page: edge-security
---

## A CSS escape cannot hide a style vector

The carve#5660 ruling decodes CSS escapes before the CARVE-P9-054 style probe. The emitted spelling of an allowed value remains authored.

::: compare

```carve
[a]{style="background:u\rl(https://x/)"}
```

```html
<p><span style="">a</span></p>
```

:::

::: compare

```carve
[a]{style="background:\75 rl(x)"}
```

```html
<p><span style="">a</span></p>
```

:::

::: compare

```carve
[a]{style="background:URL\28 x)"}
```

```html
<p><span style="">a</span></p>
```

:::

::: compare

```carve
[a]{style="background:ex\70 ression(x)"}
```

```html
<p><span style="">a</span></p>
```

:::
