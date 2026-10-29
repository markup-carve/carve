## A bare closer does not reach inside a braced inline

A code span and a braced inline are opaque to a bare delimiter (PART 9 §9 E2a).
A bare `~` inside `{/y~/}` cannot close the strike opened before the braces, so
that `~` is literal content of the italic span, and the leading `~`, left with
no closer it can reach, is literal too.

::: compare

```carve
~{/x/}{/y~/}
```

```html
<p>~<em>x</em><em>y~</em></p>
```

:::

The outer span still closes at a bare closer outside the braces. Every member of
the braced family is opaque, the editorial forms as well as the forced spans.

::: compare

```carve
~a{+b~+} c~
```

```html
<p><s>a<ins>b~</ins> c</s></p>
```

:::

The rule is the same for every bare delimiter.

::: compare

```carve
*a {_b* c_} d*
```

```html
<p><strong>a <u>b* c</u> d</strong></p>
```

:::
