---
page: edge-definitions
---

## A line block in a description under a list item takes a lazy line after a definition-shaped payload

PART 2 line_block (carve#4757). A line-block payload line is inline content whatever its shape, so a link or footnote definition there is stanza text, defines nothing, and the stanza stays open for a lazy line.

:::::: compare

`````carve
- :: u
  : ::: |
    [x]: /u
b

[x]
`````

```html
<ul>
  <li>
    <dl>
      <dt>u</dt>
      <dd>
        <div class="line-block">
          <p>[x]: /u<br>
b</p>
        </div>
      </dd>
    </dl>
  </li>
</ul>
<p>[x]</p>
```

::::::

A footnote definition under an ordered item reads the same.

:::::: compare

`````carve
1. :: u
   : ::: |
     [^1]: n
b
`````

```html
<ol>
  <li>
    <dl>
      <dt>u</dt>
      <dd>
        <div class="line-block">
          <p>[^1]: n<br>
b</p>
        </div>
      </dd>
    </dl>
  </li>
</ol>
```

::::::

A wider separator and a payload past the body column change nothing.

:::::: compare

`````carve
- :: u
  :  ::: |
       [x]: /u "t"
b
`````

```html
<ul>
  <li>
    <dl>
      <dt>u</dt>
      <dd>
        <div class="line-block">
          <p>&nbsp;&nbsp;[x]: /u “t”<br>
b</p>
        </div>
      </dd>
    </dl>
  </li>
</ul>
```

::::::
