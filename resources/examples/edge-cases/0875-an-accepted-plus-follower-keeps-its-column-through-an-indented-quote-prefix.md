---
page: edge-definitions
---

## An accepted plus follower keeps its column through an indented quote prefix

CARVE-P9-067 (carve#4630). The line after an accepted `+` reaches the host's marker column through its quote prefixes. An indented quote prefix on that follower does not move it out of the nested item.

:::::: compare

`````carve
> - - +
  > x
`````

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>x</li>
      </ul>
    </li>
  </ul>
</blockquote>
```

::::::

:::::: compare

`````carve
> - - - +
  >   x
`````

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>
          <ul>
            <li>x</li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
```

::::::
