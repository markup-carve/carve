## A lone indented image is a paragraph, and its HTML cannot say so

PART 9 §15's strict column-0 rule says a top-level block opener must start at
column 0, and `docs/divergence-from-djot.md` gives the worked example: ` # H`
renders `<p># H</p>`. A block image is a top-level block construct, so an
indented one is not one - the leading space cannot be inert for an image and
decisive for a heading.

`158-indented-image-and-caption-stay-literal` pins the indented image WITH its
caption, `-2` the same pair under a block-attribute line, and `-3` the flush-left
figure. All three carry a SECOND line, and that is the whole reason this section
exists. The lone-image promotion only fires on a paragraph whose entire content
is one image, so a caption line under the image keeps it from firing at all -
which left the one shape it does fire on pinned nowhere. carve-rs and carve-php
promoted an indented lone image to a block image, carve-js did not, and every
corpus document passed on all three while they disagreed (carve#1660).

THE HTML CANNOT SEE THE DIFFERENCE, and that is stated here rather than left for
a reader to rediscover. A paragraph whose whole content is one image renders as a
bare `<img>` with no `<p>` wrapper - the same rule `-3` leans on - so the
indented reading and the promoted one emit the same bytes. What differs is the
tree: `paragraph > image` against a top-level `image`. The pair below is
therefore an HTML control that every engine already satisfies, and the shape
comparison in `npm run ast:check` is the reader that fails on it.

::: compare

```carve
 ![Apollo](a.jpg)
```

```html
<img src="a.jpg" alt="Apollo">
```

:::

The reference spelling reaches the same promotion path by a different route: it
is never a syntactic block image, so it arrives as a paragraph and is promoted
afterwards or not at all. Indenting it must fold the same way, for the same
reason.

::: compare

```carve
 ![Apollo][moon]

[moon]: a.jpg
```

```html
<img src="a.jpg" alt="Apollo">
```

:::

### Inside a container, where the pair above cannot reach

The two examples above are both TOP-LEVEL, and that is the whole extent of what
this category pinned. Measured across every `.crv` in the corpus: the only
container-hosted image anywhere was `405-a-captioned-image-inside-a-container`,
which is flush AND captioned - so a caption line keeps the lone-image promotion
from firing at all, and no document indented an image past a container's content
column. That is why `npm run ast:check` passed 1393 documents unanimous while
carve-js emitted `<blockquote><p><img></p></blockquote>`: no check failed,
because no document reached the shape (markup-carve/carve-js#1440, carve#1677).

The four pairs below reach it. They also settle two places where the oracle
answered §1c differently depending on which container the shape sat in - a
quote framed its lone-image child on one line where a div indents it, and a list
item kept the `<p>` this section's own prose says is not written. Both were
oracle defects, ruled at carve#1677; all three engines already emitted what is
recorded here.

A QUOTE HOLDING NOTHING ELSE. The child is spelled as a paragraph and is not one
by the time it is serialized, so the quote takes the same expanded frame a `<div>`
takes for the identical child. The one-line form is for a child that stays a
paragraph, which `> t` still is.

::: compare

```carve
>   ![Apollo](a.jpg)
```

```html
<blockquote>
  <img src="a.jpg" alt="Apollo">
</blockquote>
```

:::

The flush spelling is the control, and it carries the weight here: the quote's
content column is where the image is ORDINARY, so a change that framed every
quoted paragraph the same way would show up on this pair rather than on the
indented one. Both fold to the same bytes, for the reason the top-level pair
already gives - the HTML cannot see which reading produced the image.

::: compare

```carve
> ![Apollo](a.jpg)
```

```html
<blockquote>
  <img src="a.jpg" alt="Apollo">
</blockquote>
```

:::

A LIST ITEM, INDENTED PAST ITS CONTENT COLUMN. The image uses that authored
base, but §17 still classifies the same line shape as the exact-column spelling:
the blank makes the item loose while §1c renders the lone image bare.

::: compare

```carve
- t

   ![Apollo](a.jpg)
```

```html
<ul>
  <li><p>t</p>
    <img src="a.jpg" alt="Apollo">
  </li>
</ul>
```

:::

And the flush control for the item, at the content column. It has the same
structure and loose tightness as the authored-base spelling above.

::: compare

```carve
- t

  ![Apollo](a.jpg)
```

```html
<ul>
  <li><p>t</p>
    <img src="a.jpg" alt="Apollo">
  </li>
</ul>
```

:::
