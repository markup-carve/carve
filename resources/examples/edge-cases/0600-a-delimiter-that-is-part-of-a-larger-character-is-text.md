## A delimiter that is part of a larger character is text

A delimiter counts only when it is a whole grapheme (CARVE-P3-025). Followed by
a combining mark (general category Mn, Mc or Me), a variation selector (U+FE00
to U+FE0F) or U+200D ZERO WIDTH JOINER, it is part of a larger character and
neither opens nor closes. The keycap emoji `*` U+FE0F U+20E3 is the case that
raised it: the rows show it as an opener and as a closer. A combining acute
(U+0301) after a closer, a text-style variation selector (U+FE0E) after an
opener and a ZWJ after a closer follow, each with a later delimiter that still
pairs across the skipped one. Ordinary spans next to a keycap still form. The
guard also covers the opener of a forced span and the `*` of the combined `/*`
token. The last three rows pin a spacing mark (U+093E, category Mc) after an
opener, and `{^` before U+20E3 and `{,` before U+FE0E: every forced opener
takes the guard, superscript and subscript included. The editorial and comment
frames take it too, one row each: `{+` before U+20E3, `{-` before U+FE0E, a
substitution `{~` before U+0301, an editorial comment opened by the keycap
`#` U+FE0F U+20E3, and a braced comment `{%` before U+093E. Each row holds a
later frame of the same kind that still forms.

::: compare

```carve
*️⃣abc*
```

```html
<p>*️⃣abc*</p>
```

:::

::: compare

```carve
*a*️⃣
```

```html
<p>*a*️⃣</p>
```

:::

::: compare

```carve
*a*́ b*
```

```html
<p><strong>a*́ b</strong></p>
```

:::

::: compare

```carve
_︎x _y_
```

```html
<p>_︎x <u>y</u></p>
```

:::

::: compare

```carve
~a~‍b~
```

```html
<p><s>a~‍b</s></p>
```

:::

::: compare

```carve
*x* *️⃣ *y*
```

```html
<p><strong>x</strong> *️⃣ <strong>y</strong></p>
```

:::

::: compare

```carve
{*️⃣abc*}
```

```html
<p>{*️⃣abc*}</p>
```

:::

::: compare

```carve
/*️a*/
```

```html
<p><em>*️a*</em></p>
```

:::

::: compare

```carve
*ाx *y*
```

```html
<p>*ाx <strong>y</strong></p>
```

:::

::: compare

```carve
{^⃣x^}
```

```html
<p>{^⃣x^}</p>
```

:::

::: compare

```carve
{,︎x,}
```

```html
<p>{,︎x,}</p>
```

:::

::: compare

```carve
{+⃣x+} {+y+}
```

```html
<p>{+⃣x+} <ins>y</ins></p>
```

:::

::: compare

```carve
{-︎x-} {-y-}
```

```html
<p>{-︎x-} <del>y</del></p>
```

:::

::: compare

```carve
{~́a~>b~} {~c~>d~}
```

```html
<p>{~́a~&gt;b~} <del>c</del><ins>d</ins></p>
```

:::

::: compare

```carve
{#️⃣ x#} {#y#}
```

```html
<p>{#️⃣ x#} <span class="critic-comment">y</span></p>
```

:::

::: compare

```carve
a{% y %}b {%ाx%}
```

```html
<p>ab {%ाx%}</p>
```

:::
