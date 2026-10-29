## Composite figures

A bare `::: figure` container is ONE figure holding ordered panels (PART 9
§4c, the `figure_group` production): its direct captionable children - the
`figure` and `table` nodes the unchanged inner caption rules build - are the
panels, and the `^ ` line after the closing fence is the caption of the whole
group. That closer is caption placement's sixth host (PART 9 §4), and the only
`:::` kind that takes one. The group renders class-first, the panels nested
directly in the group `figure` - HTML's figure content model admits flow
content beside a first-or-last `figcaption`, so no wrapper element sits
between them.

:::: compare

```carve
{#fig-x .columns-2}
::: figure
{#fig-x-a}
![one](a.png)
^ (a) One

{#fig-x-b}
![two](b.png)
^ (b) Two
:::
^ Figure #: Group caption
```

```html
<figure class="carve-figure-group columns-2" id="fig-x">
  <figure class="carve-figure-panel" id="fig-x-a">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel" id="fig-x-b">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
  <figcaption>Figure 1: Group caption</figcaption>
</figure>
```

::::

The group is one numbering unit (PART 9R R5): its caption's `#` draws exactly
one number from the label's sequence, and that draw also registers the panel
ids for cross-references - the group's number plus a letter by panel order.
Panels draw nothing themselves.

:::: compare

```carve
{#fig-first}
![lead](lead.png)
^ Figure #: First

{#fig-x}
::: figure
{#fig-x-a}
![one](a.png)
^ (a) One

{#fig-x-b}
![two](b.png)
^ (b) Two
:::
^ Figure #: Second

See </#fig-x> and </#fig-x-a>.
```

```html
<figure id="fig-first">
  <img src="lead.png" alt="lead">
  <figcaption>Figure 1: First</figcaption>
</figure>
<figure class="carve-figure-group" id="fig-x">
  <figure class="carve-figure-panel" id="fig-x-a">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel" id="fig-x-b">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
  <figcaption>Figure 2: Second</figcaption>
</figure>
<p>See <a href="#fig-x">Figure 2</a> and <a href="#fig-x-a">Figure 2a</a>.</p>
```

::::

A group without a caption is a valid, unnumbered group - no trailing
`figcaption` is emitted.

:::: compare

```carve
::: figure
![one](a.png)
^ (a) One

![two](b.png)
^ (b) Two
:::
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
</figure>
```

::::

A one-panel group is a valid parse, not an error (`carve lint` reports it in
strict profiles as `figure-group-single-panel`).

:::: compare

```carve
::: figure
![lone](l.png)
^ The only panel
:::
^ Figure #: One panel is valid
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="l.png" alt="lone">
    <figcaption>The only panel</figcaption>
  </figure>
  <figcaption>Figure 1: One panel is valid</figcaption>
</figure>
```

::::

Direct children that are not captionable hosts are plain group content,
preserved in place between the panels - never silently dropped, never
re-attached to a panel.

:::: compare

```carve
::: figure
Both panels were shot on the same day.

{#fig-s-a}
![one](a.png)
^ (a) One

{#fig-s-b}
![two](b.png)
^ (b) Two
:::
^ Figure #: With a note between the panels
```

```html
<figure class="carve-figure-group">
  <p>Both panels were shot on the same day.</p>
  <figure class="carve-figure-panel" id="fig-s-a">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel" id="fig-s-b">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
  <figcaption>Figure 1: With a note between the panels</figcaption>
</figure>
```

::::

The group caption takes the same allowance as every host (PART 9 §4): adjacent
or exactly one blank line attaches, two blank lines detach and leave the `^ `
line an ordinary paragraph.

:::: compare

```carve
::: figure
![one](a.png)
^ (a) One
:::


^ Figure #: Detached
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
</figure>
<p>^ Figure #: Detached</p>
```

::::

Only the `figure` kind hosts a caption at its closer. A `^ ` line after any
other container's closing fence stays what it always was: ordinary paragraph
content.

:::: compare

```carve
::: note
Body text.
:::
^ Not a caption
```

```html
<aside class="admonition note" aria-label="Note">
  <p>Body text.</p>
</aside>
<p>^ Not a caption</p>
```

::::

An opener carrying a quoted title or a `[label]` does not match
`figure_group_open` - it stays a generic Tier-2 container, metadata preserved
losslessly (`carve lint` reports `figure-group-opener-metadata`), and its
closer hosts no caption.

:::: compare

```carve
::: figure "A titled figure div"
![one](a.png)
^ (a) One
:::
^ Not a group caption

::: figure [g]
Body.
:::
```

```html
<div class="figure">
  <p class="admonition-title">A titled figure div</p>
  <figure>
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
</div>
<p>^ Not a group caption</p>
<div class="figure">
  <p class="div-label">g</p>
  <p>Body.</p>
</div>
```

::::

Groups do not nest. A bare `::: figure` opener inside an open group's body is
a generic container (`carve lint` reports `figure-group-nested`), and only the
outer group numbers.

::::: compare

```carve
::: figure
:::: figure
![one](a.png)
^ (a) One
::::
:::
^ Figure #: Outer only
```

```html
<figure class="carve-figure-group">
  <div class="figure">
    <figure>
      <img src="a.png" alt="one">
      <figcaption>(a) One</figcaption>
    </figure>
  </div>
  <figcaption>Figure 1: Outer only</figcaption>
</figure>
```

:::::

Every captionable host panels the same way: a table (captioned or not) is
wrapped in the panel `figure`, and a captioned code listing and a captioned
display-math block already render as figures and take the panel class. An
UNCAPTIONED quote is plain group content - which is how a quotation carries a
figure number without a caption of its own: leave the quote bare and caption
the group (PART 9 §4c).

:::: compare

````carve
{#fig-m}
::: figure
| Kind | N |
|------|---|
| a    | 1 |

```js
const x = 1
```
^ A listing panel

$$`E = mc^2`
^ An equation panel

> Measured twice.

> Brevity.
^ A quoted panel
:::
^ Figure #: Mixed panels
````

````html
<figure class="carve-figure-group" id="fig-m">
  <figure class="carve-figure-panel">
    <table>
      <thead>
        <tr><th scope="col">Kind</th><th scope="col">N</th></tr>
      </thead>
      <tbody>
        <tr><td>a</td><td>1</td></tr>
      </tbody>
    </table>
  </figure>
  <figure class="carve-figure-panel">
    <pre><code class="language-js">const x = 1
</code></pre>
    <figcaption>A listing panel</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <p><span class="math display" role="math">\[E = mc^2\]</span></p>
    <figcaption>An equation panel</figcaption>
  </figure>
  <blockquote><p>Measured twice.</p></blockquote>
  <figure class="carve-figure-panel">
    <blockquote><p>Brevity.</p></blockquote>
    <figcaption>A quoted panel</figcaption>
  </figure>
  <figcaption>Figure 1: Mixed panels</figcaption>
</figure>
````

::::

A captionable host takes its number where the host begins, and a figure group
begins at its opening fence - so the group draws its number before anything
inside it does (pre-order). The only construction that can observe the
difference is a numbered caption inside non-panel group content, which draws
after the group even though its caption line sits above the group's in the
source.

::::: compare

```carve
:::: figure
::: note
![x](x.png)
^ Figure #: inner
:::
::::
^ Figure #: group
```

```html
<figure class="carve-figure-group">
  <aside class="admonition note" aria-label="Note">
    <figure>
      <img src="x.png" alt="x">
      <figcaption>Figure 2: inner</figcaption>
    </figure>
  </aside>
  <figcaption>Figure 1: group</figcaption>
</figure>
```

:::::
