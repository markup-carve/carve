## A braced opener forms before an enclosing closer takes its block

Resolution is one left-to-right pass, so a braced opener inside a bare pair forms first (PART 9 E2a). When its closer sits in an attribute block glued to the bare pair's closer, the outer entry is out of reach from inside the braced span: the bare delimiter closes nothing, its block is text, and the braced closer in it closes the span. The same holds for every bare kind and every braced kind. A block glued to a delimiter that closes nothing is text too, so a braced opener at its brace still forms; a block glued to a closer that does close attaches.

::: compare

```carve
={_a={c_}
```

```html
<p>=<u>a={c</u></p>
```

:::

::: compare

```carve
_{*_{t=a*}
```

```html
<p>_<strong>_{t=a</strong></p>
```

:::

::: compare

```carve
/{^a/{k=b^}
```

```html
<p>/<sup>a/{k=b</sup></p>
```

:::

::: compare

```carve
~{,a~{k=b,}
```

```html
<p>~<sub>a~{k=b</sub></p>
```

:::

::: compare

```carve
*{=a*{k=b=}
```

```html
<p>*<mark>a*{k=b</mark></p>
```

:::

::: compare

```carve
={/a={k=b/}
```

```html
<p>=<em>a={k=b</em></p>
```

:::

::: compare

```carve
_{~a_{k=b~}
```

```html
<p>_<s>a_{k=b</s></p>
```

:::

::: compare

```carve
/{+a/{k=b+}
```

```html
<p>/<ins>a/{k=b</ins></p>
```

:::

::: compare

```carve
~{-a~{k=b-}
```

```html
<p>~<del>a~{k=b</del></p>
```

:::

::: compare

```carve
*{#a*{k=b#}
```

```html
<p>*<span class="critic-comment">a*{k=b</span></p>
```

:::

::: compare

```carve
={_a={c} b_}
```

```html
<p>=<u>a={c} b</u></p>
```

:::

::: compare

```carve
={_a=b_}
```

```html
<p>=<u>a=b</u></p>
```

:::

::: compare

```carve
a*{_k=b_}
```

```html
<p>a*<u>k=b</u></p>
```

:::

::: compare

```carve
*a*{_k=b_}
```

```html
<p><strong _k="b_">a</strong></p>
```

:::
