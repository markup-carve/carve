## A literal bracket run bounds emphasis like a resolved one

A span opened outside a bracket run is not reachable inside it, whether the run resolves or stays literal text, so a same-kind pair inside the run nests.

::: compare

```carve
*[*g*] x*
```

```html
<p><strong>[<strong>g</strong>] x</strong></p>
```

:::

::: compare

```carve
_[_g_] x_ and /[/g/] x/
```

```html
<p><u>[<u>g</u>] x</u> and <em>[<em>g</em>] x</em></p>
```

:::

::: compare

```carve
{*a [*g*] x*}
```

```html
<p><strong>a [<strong>g</strong>] x</strong></p>
```

:::

::: compare

```carve
*[*g*](u) x* and *[*g*]{.c} x*
```

```html
<p><strong><a href="u"><strong>g</strong></a> x</strong> and <strong><span class="c"><strong>g</strong></span> x</strong></p>
```

:::
