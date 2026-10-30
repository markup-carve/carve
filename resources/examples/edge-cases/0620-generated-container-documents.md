## Generated container documents

These generated documents pin how quotes, list items, definitions and fences own nearby lines. They also pin blank payload and reference registration when a duplicate footnote definition loses.

gen-020

::::::: compare

``````carve
- :: t
:  head

     a
``````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
    </dl>
  </li>
</ul>
<p>:  head</p>
<p>a</p>
```

:::::::

gen-106

::::::: compare

``````carve
:: t
:: 
``````

```html
<dl>
  <dt>t
::</dt>
</dl>
```

:::::::

gen-113

::::::: compare

``````carve
- > :: t
> : d
>   [^f]: n
tail
``````

```html
<ul>
  <li>
    <blockquote>
      <dl>
        <dt>t</dt>
      </dl>
    </blockquote>
  </li>
</ul>
<blockquote><p>: d</p></blockquote>
```

:::::::

gen-134

::::::: compare

``````carve
> :: c
  # H
``````

```html
<blockquote>
  <dl>
    <dt>c</dt>
  </dl>
</blockquote>
<section id="H">
  <h1>H</h1>
</section>
```

:::::::

gen-151

::::::: compare

``````carve
- x
    %%%
 y
   %%%
``````

```html
<ul>
  <li>x</li>
</ul>
<p>y</p>
```

:::::::

gen-162

::::::: compare

``````carve
- para
%% c
```
- a
  [^f]: t
``````

```html
<ul>
  <li>para</li>
</ul>
<pre><code>- a
  [^f]: t
</code></pre>
```

:::::::

gen-185

::::::: compare

``````carve
> . >
X
``````

```html
<blockquote>
  <ol>
    <li>
      <blockquote>

      </blockquote>
    </li>
  </ol>
</blockquote>
<p>X</p>
```

:::::::

gen-194

::::::: compare

``````carve
- %%%
%%%
:  x
   %%%
``````

```html
<ul>
  <li></li>
</ul>
<p>:  x</p>
```

:::::::

gen-203

::::::: compare

``````carve
> - +
> p
``````

```html
<blockquote>
  <ul>
    <li>p</li>
  </ul>
</blockquote>
```

:::::::

gen-224

::::::: compare

``````carve
>  ::: |
 :::
``````

```html
<blockquote>
  <div class="line-block">

  </div>
</blockquote>
<div>

</div>
```

:::::::

gen-233

::::::: compare

``````carve
- - item
 %%%
  %%%
tail
``````

```html
<ul>
  <li>
    <ul>
      <li>item</li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::::::

gen-249

::::::: compare

``````carve
> 1. :: t
   : para
``````

```html
<blockquote>
  <ol>
    <li>
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ol>
</blockquote>
<p>: para</p>
```

:::::::

gen-250

::::::: compare

``````carve
```
```
- > :: t
```
``````

```html
<pre><code></code></pre>
<ul>
  <li>
    <blockquote>
      <dl>
        <dt>t</dt>
      </dl>
    </blockquote>
  </li>
</ul>
<pre><code></code></pre>
```

:::::::

gen-259

::::::: compare

``````carve
- - a

  %% just a note
- b
``````

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
  <li><p>b</p></li>
</ul>
```

:::::::

gen-299

::::::: compare

``````carve
> - :: term
  : definition
``````

```html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>term</dt>
      </dl>
    </li>
  </ul>
</blockquote>
<p>: definition</p>
```

:::::::

gen-304

::::::: compare

``````carve
- - body

  [^g]: n
   prose
``````

```html
<ul>
  <li>
    <ul>
      <li>body</li>
    </ul>
  </li>
</ul>
```

:::::::

gen-305

::::::: compare

``````carve
- > > - para
> >   [^f]: n
``````

```html
<ul>
  <li>
    <blockquote>
      <blockquote>
        <ul>
          <li>para</li>
        </ul>
      </blockquote>
    </blockquote>
  </li>
</ul>
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
```

:::::::

gen-331

::::::: compare

``````carve
1. :: t
   : para
%% c
```
```
``````

```html
<ol>
  <li>
    <dl>
      <dt>t</dt>
      <dd>para</dd>
    </dl>
  </li>
</ol>
<pre><code></code></pre>
```

:::::::

gen-346

::::::: compare

``````carve
- :: t
:  
``````

```html
<ul>
  <li>
    <dl>
      <dt>t
:</dt>
    </dl>
  </li>
</ul>
```

:::::::

gen-350

::::::: compare

``````carve
- - ::: |
  :::
  para
tail
``````

```html
<ul>
  <li>
    <ul>
      <li>
        <div class="line-block">

        </div>
      </li>
    </ul>
    <div>
      <p>para
tail</p>
    </div>
  </li>
</ul>
```

:::::::

gen-351

::::::: compare

``````carve
- - ```
    x

[^1]: a
``````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>x

</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::::::

gen-355

::::::: compare

``````carve
> - > ~~~
  > y
``````

```html
<blockquote>
  <ul>
    <li>
      <blockquote>
        <pre><code></code></pre>
      </blockquote>
    </li>
  </ul>
  <p>y</p>
</blockquote>
```

:::::::

gen-362

::::::: compare

``````carve
- a
  [^f]: t
[^f]: a
     [r]: /url
[r][]
``````

```html
<ul>
  <li>a</li>
</ul>
<p><a href="/url">r</a></p>
```

:::::::
