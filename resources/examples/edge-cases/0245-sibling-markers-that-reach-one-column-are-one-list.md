## Sibling markers that reach one column are one list

The same column claim decides sibling markers as decides a block opener: two markers that reach one column are one list, however the indentation was written. A space advances one column and a tab advances to the next multiple of 4 (§24 C1), so four spaces and a space-plus-tab both put a marker at column 4.

This is the third shape of the rule the corpus pinned in `a tab indent is the column it reaches`, held back until the residual columns a straddling tab leaves behind stopped claiming source offsets they do not have (carve-js#773).

::: compare

```carve
- a
    - b
 	- c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::
