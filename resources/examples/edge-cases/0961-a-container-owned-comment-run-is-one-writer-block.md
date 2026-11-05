---
page: edge-lists
---

## A container-owned comment run is one writer block

CARVE-P11-079 (b) writes consecutive container-owned `%%` lines as one run. A loose host has one blank boundary on either side of the run, while a tight host keeps it without surrounding blanks. There is no blank within the run. Each spelling below reads back to the same HTML (PART 11 §1).

A loose description body.

:::: compare

```carve
:: t
: a

  %% c
  %% d

  b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <p>b</p>
  </dd>
</dl>
```

::::

Between two items of a loose list.

:::: compare

```carve
- a

  %% y
  %% z
- c
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>c</p></li>
</ul>
```

::::

A tight list keeps its run directly below its item.

:::: compare

```carve
- a
  %% y
  %% z
- c
```

```html
<ul>
  <li>a</li>
  <li>c</li>
</ul>
```

::::
