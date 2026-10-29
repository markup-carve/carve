## Marker-line nested lists

A sub-list opened on a parent item's marker line (`- - A`) is an ordinary persistent nested list, exactly as if the sub-marker sat on its own indented line. It is not a one-off lone item. This matches reference djot.js (`@djot/djot`) and CommonMark; carve previously inherited a narrower reading from djot-php that did not persist the nested list.

Following markers at the sub-list's indent merge into the same nested list, so `- - A` then `  - B` and `  - C` yields one list with three items.

::: compare

```carve
- - A
  - B
  - C
```

```html
<ul>
  <li>
    <ul>
      <li>A</li>
      <li>B</li>
      <li>C</li>
    </ul>
  </li>
</ul>
```

:::

A blank line followed by a block indented to the sub-list's content column is absorbed into the open nested item, just like any list item's lazy continuation. Here the first sub-item gains a second paragraph and the list is loose.

::: compare

```carve
- - A

    second
  - B
```

```html
<ul>
  <li>
    <ul>
      <li><p>A</p>
        <p>second</p>
      </li>
      <li><p>B</p></li>
    </ul>
  </li>
</ul>
```

:::

One column further out the same blank belongs to the OUTER item: `second` sits at the outer item's content column, so that item holds two blocks - the sub-list and a paragraph - and goes loose. The lead being a marker line is not part of the looseness test.

::: compare

```carve
- - A

  second
```

```html
<ul>
  <li>
    <ul>
      <li>A</li>
    </ul>
    <p>second</p>
  </li>
</ul>
```

:::

Flush left, the blank has closed the sub-item's paragraph and the line is below every open item's content column, so the list ends and the text is a document-level paragraph. Without the blank the same line would fold into the sub-item as lazy continuation.

::: compare

```carve
- - A

second
```

```html
<ul>
  <li>
    <ul>
      <li>A</li>
    </ul>
  </li>
</ul>
<p>second</p>
```

:::
