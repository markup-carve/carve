---
page: edge-definitions
---

## A line block in an item child keeps its stanza after a comment or marker-shaped payload

PART 9 §23 and PART 2 line_block (carve#4762, carve#4763). A comment line in verse is an empty verse line, and a marker-shaped payload line is inline content, so neither ends the stanza: a lazy line after them joins it, wherever the line block sits.

:::::: compare

`````carve
- - ::: |
    %% c
b
`````

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">
          <p><br>
b</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

::::::

The same after a text line, in a description under an item.

:::::: compare

`````carve
- :: u
  : ::: |
    x
    %% c
b
`````

```html
<ul>
  <li>
    <dl>
      <dt>u</dt>
      <dd>
        <div class="line-block">
          <p>x<br>
<br>
b</p>
        </div>
      </dd>
    </dl>
  </li>
</ul>
```

::::::

An indented colon run after a marker-shaped payload line is stanza text, not a closer.

:::::: compare

`````carve
- :: u
  : ::: |
     [x]: /u
    - l
       :::
b
`````

```html
<ul>
  <li>
    <dl>
      <dt>u</dt>
      <dd>
        <div class="line-block">
          <p>&nbsp;[x]: /u<br>
- l<br>
&nbsp;&nbsp;&nbsp;:::<br>
b</p>
        </div>
      </dd>
    </dl>
  </li>
</ul>
```

::::::
