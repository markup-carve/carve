## A code span, bracket run or arrow inside an inner pair keeps the outer opener text

A braced opener forms at the first closer of its mark at its level, past the spans that form inside it (PART 9 §9 LINEAR TIME, carve#4098). A closed code span or bracket run inside the inner pair hides no closer, and an arrow does not change which `~}` closes a `{~`, so each outer opener is still text and the inner spans still form.

::: compare

```carve
{*a {*b `c` *} {*a {*b `c` *} {*a {*b `c` *}
```

```html
<p>{*a <strong>b <code>c</code> </strong> {*a <strong>b <code>c</code> </strong> {*a <strong>b <code>c</code> </strong></p>
```

:::

::: compare

```carve
{*a {*b [c] *} {*a {*b [c] *} {*a {*b [c] *}
```

```html
<p>{*a <strong>b [c] </strong> {*a <strong>b [c] </strong> {*a <strong>b [c] </strong></p>
```

:::

::: compare

```carve
{~a ~> {~b ~} {~a ~> {~b ~} {~a ~> {~b ~}
```

```html
<p>{~a ~&gt; <s>b </s> {~a ~&gt; <s>b </s> {~a ~&gt; <s>b </s></p>
```

:::
