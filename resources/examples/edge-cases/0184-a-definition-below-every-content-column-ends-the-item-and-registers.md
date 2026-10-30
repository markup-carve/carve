## A definition below every content column ends the item and registers

A definition below every open content column ends the open items and registers (PART 0 S3). It leaves no text in the item, and with no reference to it the definition renders nothing.

::: compare

```carve
- - a
 [^f]: x
```

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
</ul>
```

:::
