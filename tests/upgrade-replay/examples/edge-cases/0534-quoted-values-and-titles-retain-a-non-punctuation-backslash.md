## Quoted values and titles retain a non-punctuation backslash

Quoted attributes and link titles resolve ASCII punctuation escapes. A backslash before a letter remains content; titles alone admit a newline (carve#2587).

::: compare

```carve
[a](/u "t\zu")
```

```html
<p><a href="/u" title="t\zu">a</a></p>
```

:::

::: compare

```carve
[a]{k="t\zu"}
```

```html
<p><span k="t\zu">a</span></p>
```

:::

::: compare

```carve
[a](/u "t\}u")
```

```html
<p><a href="/u" title="t}u">a</a></p>
```

:::

::: compare

```carve
[a]{k="t\}u"}
```

```html
<p><span k="t}u">a</span></p>
```

:::

::: compare

```carve
[a](/u "t\\u")
```

```html
<p><a href="/u" title="t\u">a</a></p>
```

:::

::: compare

```carve
[a]{k="t\\u"}
```

```html
<p><span k="t\u">a</span></p>
```

:::

::: compare

```carve
[a](/u 't\zu')
```

```html
<p><a href="/u" title="t\zu">a</a></p>
```

:::

::: compare

```carve
[a]{k='t\zu'}
```

```html
<p><span k="t\zu">a</span></p>
```

:::

::: compare

```carve
[a](/u 't\}u')
```

```html
<p><a href="/u" title="t}u">a</a></p>
```

:::

::: compare

```carve
[a]{k='t\}u'}
```

```html
<p><span k="t}u">a</span></p>
```

:::

::: compare

```carve
[a](/u 't\\u')
```

```html
<p><a href="/u" title="t\u">a</a></p>
```

:::

::: compare

```carve
[a]{k='t\\u'}
```

```html
<p><span k="t\u">a</span></p>
```

:::
