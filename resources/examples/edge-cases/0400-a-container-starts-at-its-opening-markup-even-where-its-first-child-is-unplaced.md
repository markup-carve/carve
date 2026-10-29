## A container starts at its opening markup even where its first child is unplaced

The first child is `tab gap`, produced from `tab<TAB>gap`. The tab occupies
one display column and becomes a plain space inside the merged text value.
No contiguous source slice holds that value, so the text omits `pos`.
The paragraph still starts at the beginning of its first line, before the
placed break and comment (CARVE-P12-019).

:::: compare

```carve
::: |
tab	gap
%%
:::
```

```html
<div class="line-block">
  <p>tab gap<br>
</p>
</div>
```

::::
