---
page: edge-lists
---

## A comment fence on a nested marker line closes at the first exact-width closer

CARVE-P0-005 and PART 0 S1 (carve#4116). A matched `%%%` span ends at its first exact-width closer wherever it sits, so the line after it is a paragraph and the last `%%%` opens a new comment.

:::::: compare

`````carve
. - %%%
%%%
x
%%%
`````

```html
<ol>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ol>
<p>x</p>
```

::::::
