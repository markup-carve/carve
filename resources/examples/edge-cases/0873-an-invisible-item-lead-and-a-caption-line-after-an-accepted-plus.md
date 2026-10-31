---
page: edge-lists
---

## An invisible item lead and a caption line after an accepted plus

PART 9 §4 and §17 L1b (carve#4639). A line an accepted `+` reads inside its host never captions the host itself. A blank after an invisible item lead separates nothing visible, so the list stays tight, as it does with the lead removed.

:::::: compare

`````carve
> q
+
^ c
`````

`````html
<blockquote>
  <p>q</p>
  <p>^ c</p>
</blockquote>
`````

::::::

:::::: compare

`````carve
- %% c

  Body.
- x
`````

`````html
<ul>
  <li>Body.</li>
  <li>x</li>
</ul>
`````

::::::

:::::: compare

`````carve
- [r]: /u

  Body.
- x
`````

`````html
<ul>
  <li>Body.</li>
  <li>x</li>
</ul>
`````

::::::
