## A floating attribute stops at the item boundary

§15 A2a floats a pending attribute past what renders nothing and attaches it to the next VISIBLE block. An item boundary ends that scope: the attribute does not carry into the next item's paragraph, so neither `a` nor `b` takes the class. All four implementations agree, and agreement is not a check - without a case, a future regression has nothing to fail against.

::: compare

```carve
- a

  {.c}
- b
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

:::
