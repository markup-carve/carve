## A cross-reference clones heading inline nodes

A cross-reference carries the target heading's inline markup into its link label.

:::: compare

```carve
# *Setup*

See </#Setup>.
```

```html
<section id="Setup">
  <h1><strong>Setup</strong></h1>
  <p>See <a href="#Setup"><strong>Setup</strong></a>.</p>
</section>
```

::::
