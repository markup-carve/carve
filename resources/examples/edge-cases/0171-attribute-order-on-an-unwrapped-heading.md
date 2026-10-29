## Attribute order on an unwrapped heading

A heading that carries no `<section>` wrapper emits its id on the `<h*>`, which
puts a generated attribute next to authored ones. The author's order is never
rearranged; the engine-minted id joins at the end. An id the author wrote is not
generated, so it keeps its authored position instead.

Worth pinning because the combination was previously unreachable except through
a container, and no case gave such a heading attributes - so all three engines
picked different answers here and every one of them stayed green (PART 10 §1).

::::: compare

```carve
> {a=b .c}
> # Auto

> {#x a=b}
> # Written

:::
{a=b .c}
# Divved
:::
```

```html
<blockquote>
  <h1 a="b" class="c" id="Auto">Auto</h1>
</blockquote>
<blockquote>
  <h1 id="x" a="b">Written</h1>
</blockquote>
<div>
  <h1 a="b" class="c" id="Divved">Divved</h1>
</div>
```

:::::
