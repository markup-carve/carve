## Only the id hoists to the section wrapper

On a top-level heading the id moves to the `<section>` and every other attribute
stays on the `<h*>` - identically whether the id was slugged from the heading
text or written as `{#id}`. Worth pinning because djot resolved the same question
the other way (all attributes migrate) and then implemented that resolution only
for the explicit-id case, so its two cases disagree (`jgm/djot.js#144`). Carve's
agree, and that is what keeps the rule stable when the wrapper is switched off:
the id returns to the `<h*>` and nothing else moves.

::: compare

```carve
{a=b .c}
# Auto slug

{a=b .c #explicit}
# Written id
```

```html
<section id="Auto-slug">
  <h1 a="b" class="c">Auto slug</h1>
</section>
<section id="explicit">
  <h1 a="b" class="c">Written id</h1>
</section>
```

:::
