---
page: edge-security
---

## A CSS escape cannot hide a style vector

The proposed reading of CARVE-P9-054 probes a CSS-decoded style value before deciding whether to blank it (carve#5660). The emitted spelling of an allowed value remains authored.

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
