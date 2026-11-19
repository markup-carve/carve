## Attribute hardening probes the value as emitted

::: compare

```carve
{style="ur‮l(https://evil/x)"}
p
```

```html
<p style="ur‮l(https://evil/x)">p</p>
```

:::

::: compare

```carve
{srcset="a 1x,java‮script:x 2x"}
p
```

```html
<p srcset="a 1x,java‮script:x 2x">p</p>
```

:::

::: compare

```carve
*x*{k="‮javascript:x"}
```

```html
<p><strong k="‮javascript:x">x</strong></p>
```

:::

::: compare

```carve
*x*{k="javascript:x"}
```

```html
<p><strong k="">x</strong></p>
```

:::

::: compare

```carve
[x](javascript:alert(1))
```

```html
<p><a href="">x</a></p>
```

:::
