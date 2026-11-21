## A title or label fills the container body slot

`CARVE-P10-001` keeps one blank body line only where the body renders nothing,
and it counts a rendered caption or div label as visible container content. A
container whose sole content is its opener's title therefore takes no blank line
beside it.

:::: compare

```carve
::: note "Careful"
:::
```

```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Careful</p>
</aside>
```

::::

A `[label]` fills the slot the same way, on a plain div and on a landmark that
still draws its accessible name from the `labels` map because no title was
written (`CARVE-P9-018`).

:::: compare

```carve
::: [First]
:::

::: note [End]
:::
```

```html
<div>
  <p class="div-label">First</p>
</div>
<aside class="admonition note" aria-label="Note">
  <p class="div-label">End</p>
</aside>
```

::::

A body beside the title adds no blank line either, and a body that publishes no
HTML does not bring one back: the title had already filled the slot. The minted
id counts titled blocks in document order.

:::: compare

```carve
::: note "Careful"
Visible body.
:::

::: note "Careful"
%% hidden
:::
```

```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Careful</p>
  <p>Visible body.</p>
</aside>
<aside class="admonition note" aria-labelledby="adm-2">
  <p class="admonition-title" id="adm-2">Careful</p>
</aside>
```

::::

With neither token the slot is empty and the blank line stays. This is the
control for the three pairs above: it is what tells a fix that removes the line
under a title from one that removes the line everywhere.

:::: compare

```carve
::: note
:::

:::
:::
```

```html
<aside class="admonition note" aria-label="Note">

</aside>
<div>

</div>
```

::::
