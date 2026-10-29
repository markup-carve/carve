## Braced emphasis can nest its own kind

PART 9 §9 E3. Braced emphasis can nest another braced span of the same kind.
A bare delimiter of an already open kind remains content within that scope.

::: compare

```carve
a{*{*x*}*}b
```

```html
<p>a<strong><strong>x</strong></strong>b</p>
```

:::

::: compare

```carve
*a {*b*} c*
```

```html
<p><strong>a <strong>b</strong> c</strong></p>
```

:::

::: compare

```carve
{*a *b* c*}
```

```html
<p><strong>a *b* c</strong></p>
```

:::

::: compare

```carve
{/a *b {/c/}*/}
```

```html
<p><em>a <strong>b <em>c</em></strong></em></p>
```

:::

A braced span of another kind starts its own scope, so an opener of the outer
kind nests inside it, and a closer inside it cannot reach the outer span. The
bare outer span behaves the same way.

::: compare

```carve
{*a {/b {*c*} d/} e*}
```

```html
<p><strong>a <em>b <strong>c</strong> d</em> e</strong></p>
```

:::

::: compare

```carve
{*a {/b *} d/} e*}
```

```html
<p><strong>a <em>b *} d</em> e</strong></p>
```

:::

::: compare

```carve
*a {/b *c* d/} e*
```

```html
<p><strong>a <em>b <strong>c</strong> d</em> e</strong></p>
```

:::

A lone delimiter of the span's own kind is content, whether it touches the opener or stands apart from it, so the pair opens either way.

::: compare

```carve
{==h==}

{//x//}

{= =h= =}

{/ /x/ /}
```

```html
<p><mark>=h=</mark></p>
<p><em>/x/</em></p>
<p><mark> =h= </mark></p>
<p><em> /x/ </em></p>
```

:::

An empty braced pair is literal text. Its two marks cannot overlap, so the
three-character spelling has an opener and no closer, and the four-character
spelling has both and no content.

::: compare

```carve
{**}

{*}
```

```html
<p>{**}</p>
<p>{*}</p>
```

:::

An empty pair forms no span, and its characters are read like any others
(markup-carve/carve#3973). Inside a parent of the same kind its second mark is
that parent's closer.

::: compare

```carve
{*a {**} b*}
```

```html
<p><strong>a {*</strong> b*}</p>
```

:::

Escaping the brace stops the opener and nothing else: the inner marks stay
active and pair as ordinary emphasis. Keeping the whole span literal takes an
escape on every active mark.

::: compare

```carve
\{*x*}

\{\*x\*\}
```

```html
<p>{<strong>x</strong>}</p>
<p>{*x*}</p>
```

:::

A closer that was discarded by a matched child is not retried against an
ancestor. It resolves as an ordinary bare mark followed by a literal brace,
which leaves the outer opener literal.

::: compare

```carve
{~a {*x ~>y~} z*}
```

```html
<p>{~a <strong>x <s>&gt;y</s>} z</strong></p>
```

:::

A combined token activates two kinds at once, and E3 treats both as ordinary
active kinds, so a braced child of either nests inside it.

::: compare

```carve
/*a {*b*} c*/ x

/*a {/b/} c*/ x
```

```html
<p><strong><em>a <strong>b</strong> c</em></strong> x</p>
<p><strong><em>a <em>b</em> c</em></strong> x</p>
```

:::
