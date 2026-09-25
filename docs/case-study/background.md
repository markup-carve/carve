---
description: Formats considered during Carve's early design and the syntax choices they informed.
---

# Background

## Part 1: Lightweight Markup Formats

These formats informed Carve's early syntax choices.

### 1.1 The Major Players

| Format | Focus in these notes |
|---|---|
| Markdown | Familiar prose notation and parser variants |
| reStructuredText | Explicit directives and links |
| AsciiDoc | Attributes, includes, and admonitions |
| Org-mode | Outlining and task states |
| Textile | Link and table notation |
| Creole | Wiki links and table headers |
| Gemtext | Links on separate lines |
| Djot | Parsing model and attributes |
| Typst | Commands and grouped content |

### 1.2 Notes by Format

#### Markdown

- **Strengths**: Ubiquitous, feels natural for basic text
- **Weaknesses**: Ambiguous, fragmented across CommonMark, GFM, and other variants
- **Lesson**: Familiar notation helps, but output needs specified parsing rules.

#### reStructuredText

```rst
This is *emphasis* and **strong emphasis**.

.. note::
   Directives are powerful but verbose.

`Link text <https://example.com>`_
```

- **Strengths**: Explicit directives and extensibility
- **Weaknesses**: Directives take space; links use a suffix underscore
- **Lesson**: Keep structure explicit without making common links cumbersome.

#### AsciiDoc

```asciidoc
= Document Title
:author: John Doe
:toc:

== Section

This is *bold* and _italic_.

NOTE: Admonitions are built-in.

[source,python]
----
def hello():
    print("Hello")
----
```

- **Strengths**: Document attributes, includes, admonitions, and tables
- **Weaknesses**: Many forms to learn for related tasks
- **Lesson**: Metadata and document structure deserve direct syntax.

#### Org-mode

```org
* Heading 1
** Heading 2

Regular text with *bold*, /italic/, _underline_, +strikethrough+.

- List item
  - [ ] Checkbox unchecked
  - [X] Checkbox checked

| Name  | Age |
|-------+-----|
| Alice |  30 |

#+BEGIN_SRC python
def hello():
    print("hello")
#+END_SRC
```

- **Strengths**: Outlining, TODO states, and time tracking in plain text
- **Weaknesses**: Editor conventions and `#+` directives take time to learn
- **Lesson**: Slash-delimited italics work without importing the whole workflow.

#### Textile

```textile
This is *strong* and _emphasis_ and -deleted- and +inserted+.

"Link text":http://example.com

!image.jpg!

|_. Header |_. Header |
| Cell     | Cell     |
```

- **Strengths**: Compact emphasis and link notation
- **Weaknesses**: Some markers depend on context
- **Lesson**: Carve kept `[text](url)` rather than Textile's colon link form.

#### Creole

```
This is **bold** and //italic//.

[[http://example.com|Link text]]

{{image.jpg|Alt text}}

|= Header |= Header |
| Cell    | Cell    |
```

- **Strengths**: Clear wiki link and table markers
- **Weaknesses**: Wiki links use different notation from Markdown links
- **Lesson**: `|=` gives a table header a visible marker.

#### Gemtext (Gemini Protocol)

````
# Heading
## Subheading

Regular text is just text.

=> https://example.com Link text
=> gemini://example.org Another link

* List item
* Another item

> Quote

```preformatted block
code here
```
````

- **Strengths**: Small block vocabulary; one link per line
- **Weaknesses**: No inline formatting
- **Lesson**: A link on its own line needs no inline delimiter, but that limits documents.

#### Typst

```typst
= Heading

This is *strong* and _emphasis_.

#set text(size: 12pt)
#let name = "World"

Hello, #name!

#table(
  columns: 2,
  [Header 1], [Header 2],
  [Cell 1], [Cell 2],
)
```

- **Strengths**: Programmable documents and explicit commands
- **Weaknesses**: More programming syntax than Carve's plain markup needs
- **Lesson**: `#` commands and `[]` groups keep their roles visible.

### 1.3 Other Notable Ideas

#### CriticMarkup (Editorial Annotations)

```
{++addition++}
{--deletion--}
{~~old~>new~~}
{==highlight==}{>>comment<<}
```

- **Lesson**: Insertions and deletions can be recorded in plain text.

#### Fountain (Screenwriting)

```
INT. COFFEE SHOP - DAY

JOHN
(nervous)
I have something to tell you.
```

- **Lesson**: Position and convention can mark screenplay structure with little punctuation.

#### YAML Frontmatter (Metadata)

```yaml
---
title: My Document
author: Jane Doe
date: 2024-01-15
tags: [tutorial, beginner]
---
```

- **Lesson**: Frontmatter gives document metadata a predictable place.

---

## Part 2: Readability Assumptions

### 2.1 Paper and Keyboard Analogies

These paper-to-keyboard analogies were design prompts, not results of a user study:

| Intent          | Paper Action           | Keyboard Approximation |
|-----------------|------------------------|------------------------|
| Emphasis        | Underline              | `_text_`               |
| Strong emphasis | Circle / Box           | `[text]` or `*text*`   |
| Deletion        | Strikethrough          | `~text~` or `-text-`   |
| Insertion       | Caret + write above    | `^text^`               |
| Comment         | Margin note            | `%% comment`           |
| Reference       | Number in circle       | `[1]` or `(1)`         |
| Quote           | Quote marks            | `"text"` or `> text`   |

### 2.2 Potential Markdown Stumbling Points

The design notes identified these points to simplify:

1. **Link syntax order** - Writers may reverse `[]` for the label and `()` for the destination.
2. **Nested lists** - The required indentation can be hard to predict.
3. **Code blocks** - Backtick key location varies by keyboard
4. **Line breaks** - Two spaces at end of line is invisible
5. **Emphasis** - One and two asterisks have different meanings.
6. **Escaping** - An unescaped `*` can start emphasis unexpectedly.

### 2.3 Readability Goals

The goals were to make common constructs easy to recognize in source, easy to
recall after time away, and distinguishable from ordinary prose without reading
the whole document.
