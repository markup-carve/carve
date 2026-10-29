## A content tab does not hide a description boundary

:::: compare

```carve
- :: t
: 	text
```

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
    </dl>
  </li>
</ul>
<p>: 	text</p>
```

::::
