## An unresolved image gives its whole caption slot back, at any depth

Block-image status is a property of the RESOLVED tree, so the caption binds at
promotion and not on the source shape (PART 9R R7). A `^ ` line after an image
paragraph is an unbound SLOT until the promotion phase runs, and a paragraph the
phase does not promote gives the slot's source lines back as its own text.

The four one-line rows are pinned already - a resolved reference image with and
without a caption in categories 207 and 412, the unresolved counterparts in 201,
209 and 412. What no CORPUS document held is the give-back on a slot more than
one line wide, held only against the oracle by a unit test no engine runs, and
the give-back at DEPTH, held by nothing at all. Both are paths on which a line of
the document can be lost.

A caption ends the way an open paragraph does (PART 2, MULTI-LINE CAPTIONS), so
this slot is two lines wide. All of it comes back:

::: compare

```carve
![a][r]
^ cap one
continued
```

```html
<p>![a][r]
^ cap one
continued</p>
```

:::

The resolved control takes the same two lines as one folded caption, which is
what makes the row above a give-back rather than a truncation.

::: compare

```carve
![a][r]
^ cap one
continued

[r]: /u
```

```html
<figure>
  <img src="/u" alt="a">
  <figcaption>cap one
continued</figcaption>
</figure>
```

:::

An image paragraph can sit in any container, so the phase reaches the whole tree
rather than the document's top level. Inside a list item the unpromoted
paragraph keeps both lines, and the tight item renders them without a wrapper.

::: compare

```carve
- ![a][r]
  ^ cap
```

```html
<ul>
  <li>![a][r]
^ cap</li>
</ul>
```

:::

The control at the same depth: the definition sits outside the list, the image
promotes, and the item holds a figure.

::: compare

```carve
- ![a][r]
  ^ cap

[r]: /u
```

```html
<ul>
  <li>
    <figure>
      <img src="/u" alt="a">
      <figcaption>cap</figcaption>
    </figure>
  </li>
</ul>
```

:::
