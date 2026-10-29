## An attribute name admits no colon

`identifier` is the production behind every attribute name - `#id`, `.class`,
`key=value` and a bare boolean key all build on it - and it admits letters,
digits, `_` and `-` only. A colon-bearing name is therefore not recognized, and
§14's rule that ONE unrecognized name makes the whole `{...}` not an attribute
block leaves the run literal.

Nothing pinned this. No corpus document carried a colon in an attribute name,
so `compare:impls` had no input that could show carve-php building
`xlink:href`, `class="a:b"` and `id="a:b"` where carve-js and carve-rs left the
same source literal (carve#797). The `id` row is the one with teeth: an anchor
target exists in one engine and not in the other, so a link to `#a:b` resolves
or dangles depending on which engine rendered the page.

The `#a:b` row does not render as inert text a reader sees verbatim. The
attribute block is rejected and the leftover source is inline-parsed, so the
`#a` inside it is an ordinary hashtag - which is why pinning the rendering is
worth more here than describing it.

::: compare

```carve
[a]{xlink:href=u}

[b]{k:v="q"}

[c]{.sm:hover}

[d]{#a:b}

[e]{.ok xml:lang=en}
```

```html
<p>[a]{xlink:href=u}</p>
<p>[b]{k:v=“q”}</p>
<p>[c]{.sm:hover}</p>
<p>[d]{<span class="tag"><strong>#a</strong></span>:b}</p>
<p>[e]{.ok xml:lang=en}</p>
```

:::

The colon is legal one position over, inside an unquoted VALUE, which
`unquoted_value` admits so that `xml:lang` and `sm:hover` need no quoting when
they are what an attribute HOLDS rather than what it is called. This pair is
the control: it fails if a fix reaches past the name into the value.

::: compare

```carve
[a]{k=x:y}

[b]{#i .c k=v}

| a | b |{.x}
```

```html
<p><span k="x:y">a</span></p>
<p><span id="i" class="c" k="v">b</span></p>
<table>
  <tbody>
    <tr class="x"><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

A carrier other than an inline span reaches the same answer, so a table row
whose trailing block carries a colon is not a table row at all, and a bullet
whose glued block carries one does not open a list.

::: compare

```carve
| a | b |{.a:b}

-{.a:b} item
```

```html
<p>| a | b |{.a:b}</p>
<p>-{.a:b} item</p>
```

:::
