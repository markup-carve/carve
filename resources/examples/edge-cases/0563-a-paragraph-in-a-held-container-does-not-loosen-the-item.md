## A paragraph in a held container does not loosen the item

PART 9 section 17 L1 counts the item's own paragraphs. A second paragraph
in its description body keeps the item tight. The control puts the second
paragraph in the item itself, which makes it loose (carve#2988).

::: compare

```carve
- intro
  :: term
  : body

    text
```

```html
<ul>
  <li>intro
    <dl>
      <dt>term</dt>
      <dd>
        <p>body</p>
        <p>text</p>
      </dd>
    </dl>
  </li>
</ul>
```

```carve
- :: term
  : body

    text
```

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>
        <p>body</p>
        <p>text</p>
      </dd>
    </dl>
  </li>
</ul>
```

```carve
- intro
  :: term
  : body

  text
```

```html
<ul>
  <li><p>intro</p>
    <dl>
      <dt>term</dt>
      <dd>body</dd>
    </dl>
    <p>text</p>
  </li>
</ul>
```

:::
