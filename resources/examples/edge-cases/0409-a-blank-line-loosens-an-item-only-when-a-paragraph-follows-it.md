## A blank line loosens an item only when a paragraph follows it

PART 9 §17 L1 loosens a list when "some item holds a blank-line-separated second
paragraph"; §17 L2 is the other half, where a sub-block attached after a blank
ATTACHES and the item stays tight. Between them sits the question of which of the
two a blank line opens, and the answer is decided by what follows it rather than
by the blank.

The mechanism is the one carve#1266 settled: an attached block CONSUMES the blank
the gap held. A container has an opener, so the opener absorbs the separation and
by the time tightness is decided there is no blank left to loosen with. A
paragraph has no opener to absorb it, so the separation survives, and a
blank-line-separated second paragraph is exactly what L1 asks for.

So the line the rule draws is a following PARAGRAPH against every other block
type, and it is the same line the
`323-a-block-attached-after-an-invisible-line-leaves-the-item-tight` family
already pins from the other side - there an invisible line sits in the gap and
the attachment still consumes it.

Nothing pinned the plain shapes, which is how carve#1622 found carve-js and
carve-php disagreeing about the container. A tight list's HTML cannot show a
paragraph boundary INSIDE a container, but it does show the lead's `<p>` wrapper,
so an ordinary pair can see the difference at the item.

A paragraph after the blank: the item is loose, and every item of the list wraps.

::: compare

```carve
- x

  y
- z
```

```html
<ul>
  <li><p>x</p>
    <p>y</p>
  </li>
  <li><p>z</p></li>
</ul>
```

:::

The same blank line above a container, which is carve#1622's shape: the item is
tight, and the lead keeps no wrapper. The container's own body is loose for its
own reasons - that is the div's blank line, not the item's.

::: compare

```carve
- x

  ::: d
  a

  b
  :::
- z
```

```html
<ul>
  <li>x
    <div class="d">
      <p>a</p>
      <p>b</p>
    </div>
  </li>
  <li>z</li>
</ul>
```

:::

A quote in the same position, because the rule is about the paragraph and not
about the container specifically:

::: compare

```carve
- x

  > q
- z
```

```html
<ul>
  <li>x
    <blockquote><p>q</p></blockquote>
  </li>
  <li>z</li>
</ul>
```

:::
