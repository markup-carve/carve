## A core directive-kind class leads authored attributes

The kind identifies the core div. Its class leads both authored attributes
(CARVE-P10-011).

:::::: compare no-render

```carve
{#d k=v}
::: foo
a
:::
```

```html
<div class="foo" id="d" k="v">
  <p>a</p>
</div>
```

::::::
