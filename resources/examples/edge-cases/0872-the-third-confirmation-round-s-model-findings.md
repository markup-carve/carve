---
page: edge-definitions
---

## The third confirmation round's model findings

A marker between an item's columns folds into a note on the item's marker line (carve#4545, carve#4614). A lazy line closes no line block (PART 0 S4, carve#4615). A caption number stays out of the tag before it (CARVE-P2-022, carve#4616). A line that misses a comment fence's owner ends the fence in every host (PART 0 S1, carve#4617). A task item's content column keeps its authored separator (CARVE-P9-083, carve#4618). A paragraph after a literal directive loosens an item (PART 10 I2, carve#4619). An attached attribute run holds no substitution arrow (PART 9 SS22 R3, carve#4620). Comments do not hide a caption host (PART 9R, carve#4621). A base class takes the class slot's spelling (PART 10 §1, carve#4622).

::::: compare

````carve
- [^q]: note
 * child

r[^q]
````

````html
<ul>
  <li></li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
* child<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::

::::: compare

````carve
> - [^q]: n
>  * c

r[^q]
````

````html
<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n
* c<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::

::::: compare

````carve
- ::: |
  a
lazy
  :::
tail
````

````html
<ul>
  <li>
    <div class="line-block">
      <p>a<br>
lazy</p>
    </div>
  </li>
</ul>
<p>tail</p>
````

:::::

::::: compare

````carve
:: t
: ::: |
  a
lazy
  :::
tail
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <div class="line-block">
      <p>a<br>
lazy</p>
    </div>
  </dd>
</dl>
<p>tail</p>
````

:::::

::::: compare

````carve
{#t}
| b |
^ #y#

</#t>
````

````html
<table id="t">
  <caption><span class="tag"><strong>#y</strong></span>1</caption>
  <tbody>
    <tr><td>b</td></tr>
  </tbody>
</table>
<p><a href="#t"><span class="tag"><strong>#y</strong></span> 1</a></p>
````

:::::

::::: compare

````carve
| b |
^ *a*#
````

````html
<table>
  <caption><strong>a</strong>1</caption>
  <tbody>
    <tr><td>b</td></tr>
  </tbody>
</table>
````

:::::

::::: compare

````carve
> %%%
> x
y
> %%%
````

````html
<blockquote><p>x</p></blockquote>
<p>y</p>
<blockquote>

</blockquote>
````

:::::

::::: compare

````carve
:: t
: %%%
  x
y
  %%%
````

````html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<p>y</p>
````

:::::

::::: compare

````carve
[^n]: %%%
  x
y
  %%%

r[^n]
````

````html
<p>y</p>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::

::::: compare

````carve
-   [ ] q
  # H
````

````html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="q"> q</li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
````

:::::

::::: compare

````carve
-   [ ] q
   - [ ] r
````

````html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="q"> q</li>
  <li><input type="checkbox" disabled aria-label="r"> r</li>
</ul>
````

:::::

::::: compare

````carve
- {{ _x_ @code:js }}
  ^ c
````

````html
<ul>
  <li><p>{{ _x_ @code:js }}</p>
    <p>^ c</p>
  </li>
</ul>
````

:::::

::::: compare

````carve
{~`a`{k="~>"}b~}
````

````html
<p><s><code k="~&gt;">a</code>b</s></p>
````

:::::

::::: compare

````carve
{~{+a+}{k="~>"}b~}
````

````html
<p><s><ins k="~&gt;">a</ins>b</s></p>
````

:::::

::::: compare

````carve
{~p~>[x](/u){k="~}"}b~}
````

````html
<p><del>p</del><ins><a href="/u" k="~}">x</a>b</ins></p>
````

:::::

::::: compare

````carve
$$`a` %% c
^ cap
````

````html
<figure>
  <p><span class="math display" role="math">\[a\]</span></p>
  <figcaption>cap</figcaption>
</figure>
````

:::::

::::: compare

````carve
{%%}![a](/i)
^ cap
````

````html
<figure>
  <img src="/i" alt="a">
  <figcaption>cap</figcaption>
</figure>
````

:::::

::::: compare

````carve
{CLASS=c}
- [ ] a
````

````html
<ul CLASS="task-list c">
  <li><input type="checkbox" disabled aria-label="a"> a</li>
</ul>
````

:::::

::::: compare

````carve
$`a`{CLASS=c}
````

````html
<p><span CLASS="math inline c" role="math">\(a\)</span></p>
````

:::::
