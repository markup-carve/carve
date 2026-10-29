## Nested containers

A bare colon fence closes a container only when it is EXACTLY as long as that
container's opener. Nesting therefore needs the two fences to differ, and the
canonical direction is one colon wider per level inward. A longer-outer
document like the one below parses too - exact matching does not care which
way the lengths run.

::::: compare

```carve
:::: note
Outer.

::: tip
Nested.
:::
::::

```

```html
<aside class="admonition note" aria-label="Note">
  <p>Outer.</p>
  <aside class="admonition tip" aria-label="Tip">
    <p>Nested.</p>
  </aside>
</aside>
```

:::::

Equal-length fences nest. `::: tip` is not a closer - a closer is bare - so it
opens a container inside the note, and the two bare fences close them
innermost-first.

:::: compare

```carve
::: note
::: tip
Inner.
:::
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <aside class="admonition tip" aria-label="Tip">
    <p>Inner.</p>
  </aside>
</aside>
```

::::

Widening the fence for the deeper level is the canonical direction. A bare
`::::` does not match the open `:::`, so it is not a closer; it opens a child.
This is the form `carve fmt` emits.

::::: compare

```carve
:::
Outer

::::
Inner
::::
:::
```

```html
<div>
  <p>Outer</p>
  <div>
    <p>Inner</p>
  </div>
</div>
```

:::::

An opener always opens. A container still open at the end of the input closes
there, so a forgotten closer costs you the container's extent, not the rest of
the document. Lint and the language server flag it.

:::: compare

```carve
::: note
X
```

```html
<aside class="admonition note" aria-label="Note">
  <p>X</p>
</aside>
```

::::

One closer closes one container, not every container open above it. Here the
`:::` closes `c`; `a` and `b` have no closer of their own and close at the end
of the input by the rule above. Djot's bare closer instead closes every open
container of equal-or-lesser length in one go.

:::::: compare

```carve
::::: a
:::: b
::: c
X
:::
```

```html
<div class="a">
  <div class="b">
    <div class="c">
      <p>X</p>
    </div>
  </div>
</div>
```

::::::
