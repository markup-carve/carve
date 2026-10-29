## A bare closer does not reach inside a cross-reference

A cross-reference is opaque to a bare delimiter like an autolink (PART 8 ranks
both above emphasis, PART 9 §9 E2a), so the slash of `</#id>` cannot close
emphasis opened before it, whether or not the target resolves.

::: compare

```carve
{#intro}
# Intro

x /a </#intro> y
```

```html
<section id="intro">
  <h1>Intro</h1>
  <p>x /a <a href="#intro">Intro</a> y</p>
</section>
```

:::

::: compare

```carve
x /a </#nothing> y
```

```html
<p>x /a &lt;/#nothing&gt; y</p>
```

:::
