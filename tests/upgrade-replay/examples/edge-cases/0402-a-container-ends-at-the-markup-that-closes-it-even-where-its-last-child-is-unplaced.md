## A container ends at the markup that closes it even where its last child is unplaced

The last child is `tab gap`, produced from `tab<TAB>gap`. It omits `pos`
because its space was synthesized from a tab. The paragraph ends at offset
16, where that source line ends, rather than offset 9, where the preceding
break ends (CARVE-P12-020).

:::: compare

```carve
::: |
%%
tab	gap
:::
```

```html
<div class="line-block">
  <p><br>
tab gap</p>
</div>
```

::::
