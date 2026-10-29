## Empty containers share one HTML body shape

PART 10 SS4 keeps one blank body line when an empty container renders. The
container kind does not change that slot.

:::: compare

```carve
:::
Visible body.
:::
```

```html
<div>
  <p>Visible body.</p>
</div>
```

::::

A comment-only body has the same shape because the comment publishes no HTML.
The line-block case is the PART 9 §23 exception: its comment-only line becomes
an empty verse paragraph, so the body is visible rather than empty.

:::: compare

```carve
:::
%% hidden
%% hidden too
:::

::: custom
%% hidden
:::

::: note
%% hidden
:::

::: >
%% hidden
:::

::: |
%% hidden
:::

::: \
%% hidden
:::

::: figure
%% hidden
:::
```

```html
<div>

</div>
<div class="custom">

</div>
<aside class="admonition note" aria-label="Note">

</aside>
<blockquote>

</blockquote>
<div class="line-block">
  <p></p>
</div>
<div class="hardbreaks">

</div>
<figure class="carve-figure-group">

</figure>
```

::::
