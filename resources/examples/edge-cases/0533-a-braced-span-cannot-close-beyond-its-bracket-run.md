## A braced span cannot close beyond its bracket run

A forced span or an editorial insertion, deletion or substitution opened inside a bracket run cannot pair with a closer outside that run (PART 8 parsing precedence). Both delimiters remain literal. Complete spans inside a run still parse. Editorial comments are opaque to bracket scanning, so a bracket inside a comment opens no run; the final controls pin those cases.

::: compare

```carve
[{^a]^}
```

```html
<p>[{^a]^}</p>
```

:::

::: compare

```carve
[{,a],}
```

```html
<p>[{,a],}</p>
```

:::

::: compare

```carve
[{*a]*}
```

```html
<p>[{*a]*}</p>
```

:::

::: compare

```carve
[{/a]/}
```

```html
<p>[{/a]/}</p>
```

:::

::: compare

```carve
[{+a]+}
```

```html
<p>[{+a]+}</p>
```

:::

::: compare

```carve
[{-a]-}
```

```html
<p>[{-a]-}</p>
```

:::

::: compare

```carve
[{~a]~}
```

```html
<p>[{~a]~}</p>
```

:::

::: compare

```carve
[{_a]_}
```

```html
<p>[{_a]_}</p>
```

:::

::: compare

```carve
[{=a]=}
```

```html
<p>[{=a]=}</p>
```

:::

::: compare

```carve
[{~a ~> b]~}
```

```html
<p>[{~a ~&gt; b]~}</p>
```

:::

::: compare

```carve
[{#a]#}
```

```html
<p>[<span class="critic-comment">a]</span></p>
```

:::

::: compare

```carve
[{+a+}]
```

```html
<p>[<ins>a</ins>]</p>
```

:::

::: compare

```carve
[{^a^}]
```

```html
<p>[<sup>a</sup>]</p>
```

:::
