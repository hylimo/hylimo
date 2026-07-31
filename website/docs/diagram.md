---
outline: deep
---

# Diagram DSL

The diagram DSL is the layer between [SyncScript](./syncscript.md) and the concrete diagram types.
It provides everything which is not specific to a notation: elements, styles, positions and
connections.

You meet it in two situations: when you want to go beyond what a diagram type offers - a custom
shape, an extra label, a color which depends on a variable - and when you draw something which is not
a UML diagram at all.

## Creating a diagram

Every diagram is created by a diagram function, and the diagram must be the value of the file, so it
is usually the last (and only) top-level expression:

```hyl
diagram {
    // diagram content
}
```

`diagram` is the plain one: a canvas and nothing else.
The [diagram types](./class.md) are the same function with an additional vocabulary, so everything
below works in `classDiagram`, `sequenceDiagram` and the others as well.

::: details The low-level function
`createDiagram` creates a diagram from a root element, styles and fonts.
The diagram functions are built on it, and there is rarely a reason to call it directly.
:::

## Elements

Elements are the building blocks of a diagram.
Each element is created by a function of its name, takes element-specific attributes as named
arguments, and takes its children in a trailing lambda:

```hylimo
diagram {
    element(shape(shape = defaultShapes.rect, fill = "#dbeafe") {
        text {
            span(text = "Hello World")
        } styles {
            margin = 16
        }
    })
}
```

| Element                    | What it is                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `shape`                    | A parametric shape - rectangle, ellipse, diamond, database … - with optional content, see [Shapes](./shapes.md) |
| `path`                     | An SVG path                                                                                                     |
| `text`                     | A text element, containing at least one span                                                                    |
| `span`                     | A run of text with its own styling                                                                              |
| `container`                | A container which lays out its children, see [below](#containers)                                               |
| `canvas`                   | A canvas on which elements and connections are positioned                                                       |
| `canvasElement`            | An element with a position on a canvas                                                                          |
| `canvasConnection`         | A connection between two points or elements, made up of segments                                                |
| `canvasLineSegment`        | A straight line between two points                                                                              |
| `canvasBezierSegment`      | A cubic bezier curve, defined by two control points                                                             |
| `canvasAxisAlignedSegment` | An axis-aligned poly line of one to three parts                                                                 |
| `absolutePoint`            | A point with absolute coordinates                                                                               |
| `relativePoint`            | A point relative to another point or canvas element                                                             |
| `linePoint`                | A point on a connection or on the outline of an element                                                         |
| `marker`                   | An element at the start or end of a connection, such as an arrow tip                                            |

Canvas elements, connections and points are rarely created through these functions directly - the
[canvas constructs](#canvas-constructs) below are the comfortable way to do it.

### Containers

A `container` stacks its children, and how it does that is decided by its `layout` style:

| `layout`  | Effect                                           |
| --------- | ------------------------------------------------ |
| `"stack"` | Children are stacked on the z-axis (the default) |
| `"vbox"`  | Children are stacked vertically                  |
| `"hbox"`  | Children are stacked horizontally                |

A `padding` style keeps space between the container and its children. Unlike a `margin`, which is
space _around_ an element that its siblings have to make room for, padding is space the element
itself takes up and hands out to nobody — the container grows by it, and every child stays inside it
without having to say so. The same style works on every element that lays out contents: `container`,
`shape`, `canvasElement` and `marker`.

```hylimo
diagram {
    element(container(layout = "hbox") {
        text {
            span(text = "left")
        } styles {
            marginRight = 20
        }
        text {
            span(text = "right")
        }
    })
}
```

### Text

A `text` contains one or more `span`s, and each span carries its own font styling, which makes mixed
formatting possible:

```hylimo
diagram {
    element(text {
        span(text = "normal ")
        span(text = "bold", fontWeight = "bold")
        span(text = " and ")
        span(text = "italic", fontStyle = "italic")
    })
}
```

## Canvas constructs

A canvas is what makes a graph-based diagram: it positions elements freely and connects them.
The content of every `diagram` block is a canvas, and the following constructs are available inside
it.

### `element`

Puts arbitrary content onto the canvas:

```hyl
element {
    text {
        span(text = "Hello World")
    }
}
```

### Points

| Function | Creates                                                                                       |
| -------- | --------------------------------------------------------------------------------------------- |
| `apos`   | An absolute point, from `x` and `y`                                                           |
| `rpos`   | A point relative to a target, from `target`, `x` and `y`                                      |
| `lpos`   | A point on a line, from `target`, the relative position on it, and an optional distance to it |

Relative points are what keeps a diagram maintainable: if a class is placed with
`rpos(OtherClass, 300, 0)`, moving `OtherClass` moves it along.

### `layout` operator

Sets the position and size of a canvas element - and **only** of a canvas element, not of arbitrary
diagram elements:

```hyl
element {
    // some content
} layout {
    width = 100
    height = 100
    pos = apos(10, 20)
}
```

### `with` operator

Shapes a connection: it defines the route the connection takes, and the labels along it.

```hyl
aCanvasConnection with {
    over = start().line(apos(10, 20)).line(end())
    // a label in the middle of the connection, 100 away from it
    label("the text of the label", 0.5, 100)
}
```

The route is built with a fluent builder.
`start` and `end` take the relative position on the outline if the endpoint is an element, and no
argument if it is a point:

```hyl
// canvas element start / end
start(0)
end(0)
// point start / end
start()
end()
```

Between them, any number of segments can be added:

- `line` adds a straight segment per positional argument:
  ```hyl
  // 1 segment
  start(0).line(end(0))
  // 2 segments
  start(0).line(apos(100, 100), end(0))
  ```
- `bezier` adds a cubic bezier segment.
  It takes the relative coordinates of the start control point, the end point, and the relative
  coordinates of the end control point.
  Repeating the first two parameters adds further segments, whose control points are mirrored at each
  inner point:
  ```hyl
  // 1 segment
  over = start(0).bezier(100, 100, end(0), 100, 100)
  // 2 segments
  over = start(0).bezier(100, 100, apos(100, 100), 100, 100, end(0), 100, 100)
  ```
- `axisAligned` adds an axis-aligned segment.
  It takes a relative position between -1 and 1 and the end point: a positive value is the relative
  position of the vertical part, a negative value the relative position of the horizontal part.
  Inputs can be repeated for multiple segments:
  ```hyl
  // 1 segment, horizontal first
  over = start(0).axisAligned(0.5, end(0))
  // 1 segment, vertical first
  over = start(0).axisAligned(-0.5, end(0))
  // 2 segments
  over = start(0).axisAligned(0.5, apos(100, 100), -0.5, end(0))
  ```

`label` takes the text, the relative position on the connection, and the distance to the connection.
Both are what the graphical editor writes when a label is dragged.

### Connection operators

The operators which create connections - `--`, `-->`, `..>` and their relatives - are defined by the
diagram types, because which connections exist is part of the notation.
See the diagram type pages, for example [associations](./class.md#associations).

::: details Custom connection operators
A plain `diagram` has no connection operators, but one can be created with
`internal.createConnectionOperator`, optionally with markers and a style class.
This is an internal API and may change.

```hyl
diagram {
    a = element {
        text {
            span(text = "A")
        }
    }
    b = element {
        text {
            span(text = "B")
        }
    } layout {
        pos = apos(300, 0)
    }

    -- = internal.createConnectionOperator()

    a -- b with {
        over = start(Position.Right).line(end(Position.Left))
        label("connects", 0.5, 25)
    }
}
```

:::

## Styles

Styles decide how elements look.
They can be written directly on an element, which is short but neither reusable nor overridable:

```hyl
span(text = "Hello World", fontWeight = "bold")
```

Or they can be defined in a `styles` block, which works like SCSS: selectors, nesting, and one rule
for many elements.

```hyl
styles {
    any {
        fill = "green"
    }
}
```

### Selectors

| Selector | Matches                                      |
| -------- | -------------------------------------------- |
| `type`   | All elements of a type, e.g. `type("shape")` |
| `cls`    | All elements with a style class              |
| `any`    | All elements                                 |

Selectors can be nested, and a nested selector applies to the descendants of the outer one:

```hyl
styles {
    cls("class") {
        cls("title") {
            fontWeight = "bold"
        }
    }
}
```

Style classes are assigned with the `class` attribute, or added with the `styles` operator:

```hylimo
diagram {
    element(shape(shape = defaultShapes.rect, class = list("box")) {
        text {
            span(text = "normal")
        }
    })

    element(shape(shape = defaultShapes.rect, class = list("box", "highlight")) {
        text {
            span(text = "highlighted")
        }
    }) layout {
        pos = apos(220, 0)
    }

    styles {
        cls("box") {
            width = 160
            height = 60
            fill = var("background")
            type("text") {
                hAlign = HAlign.Center
                vAlign = VAlign.Center
            }
        }
        cls("highlight") {
            stroke = var("accent")
            strokeWidth = var("strokeWidth") * 2
        }
        vars {
            accent = "#e36209"
        }
    }
}
```

### `styles` operator

Applied to a single element, `styles` defines styles for exactly that element, including nested
selectors for its children:

```hyl
shape(shape = defaultShapes.rect) styles {
    fill = "green"
    any {
        fontSize = 10
    }
}
```

It is also the way to add a style class to an element after it has been created:

```hyl
shape(shape = defaultShapes.rect) styles {
    class += "test-shape"
}
// is equivalent to
shape(shape = defaultShapes.rect, class = list("test-shape"))
```

### Variables

Variables work like CSS custom properties: `var("name")` reads one, and a selector defines them.

```hyl
type("shape") {
    stroke = var("primary")
}
```

```hyl
any {
    variables.primary = "green"
}
```

Because setting variables for a whole diagram is common, `vars` does the same with less noise:

```hyl
vars {
    primary = "green"
    secondary = "blue"
}
// is equivalent to
any {
    variables.primary = "green"
    variables.secondary = "blue"
}
```

Variables can be calculated with, so a value can be derived instead of duplicated:

```hyl
strokeWidth = var("strokeWidth") * 2
```

A style attribute can also be reset to its default with `unset`.

### Style variables

The following style variables exist in every diagram, independent of its type:

| Variable          | Meaning                                                    | Default value              |
| ----------------- | ---------------------------------------------------------- | -------------------------- |
| `primary`         | Color used for strokes and texts                           | primary color of the theme |
| `background`      | Color used to fill elements which hide what is behind them | background color of theme  |
| `strokeWidth`     | Width of strokes in pixels                                 | 2                          |
| `fontSize`        | Font size of texts in pixels                               | 16                         |
| `subcanvasMargin` | Margin around the contents of a nested canvas in pixels    | 40                         |

The variables of the individual diagram types are documented on their respective pages.

::: tip Theming
`primary` and `background` follow the light/dark theme and the colors configured in the
[settings](./editor.md#theme).
Using them instead of fixed colors is what makes a diagram render correctly in both modes.
:::

### Style attributes

Which attributes an element supports depends on its type.

**Layout** - supported by all elements which are laid out, such as `shape`, `path`, `container` and
`text`:

| Attribute                                                          | Meaning                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `width`, `minWidth`, `maxWidth`                                    | Width of the element, `width` takes precedence over the other two      |
| `height`, `minHeight`, `maxHeight`                                 | Height of the element, `height` takes precedence over the other two    |
| `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft` | Space around the element                                               |
| `hAlign`, `vAlign`                                                 | Horizontal and vertical alignment within the parent                    |
| `visibility`                                                       | `"visible"`, `"hidden"` (invisible, still takes space) or `"collapse"` |
| `grow`, `shrink`, `base`                                           | How the element grows and shrinks in an `hbox` or `vbox`               |
| `layout`                                                           | How the element lays out its contents: `"stack"`, `"vbox"` or `"hbox"` |
| `padding`                                                          | Space the element keeps between itself and its contents                |

For the attributes which take one of a fixed set of values, enum objects exist, so `HAlign.Center`
can be written instead of `"center"`: `HAlign`, `VAlign`, `Visibility` and - for relative positions
on an outline - `Position`.

**Stroke and fill** - supported by shape-like elements, meaning `shape`, `path` and connections:

| Attribute                                             | Meaning                                        |
| ----------------------------------------------------- | ---------------------------------------------- |
| `stroke`, `strokeOpacity`, `strokeWidth`              | Color, opacity and width of the stroke         |
| `strokeDash`, `strokeDashSpace`                       | Dash length and gap length, for dashed strokes |
| `strokeLineJoin`, `strokeLineCap`, `strokeMiterLimit` | How corners and ends of the stroke are drawn   |
| `fill`, `fillOpacity`                                 | Color and opacity of the fill                  |

**Text** - supported by `span`, and inherited from the enclosing `text`:

| Attribute                                                                                                    | Meaning                          |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `fill`                                                                                                       | Color of the text                |
| `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `fontFeatureSettings`                                   | Which font is used and how       |
| `underline`, `underlineOpacity`, `underlineWidth`, `underlineDash`, `underlineDashSpace`                     | Underline and its appearance     |
| `strikethrough`, `strikethroughOpacity`, `strikethroughWidth`, `strikethroughDash`, `strikethroughDashSpace` | Strikethrough and its appearance |

`shape` additionally supports `shape` and `cornerRounding`, see [Shapes](./shapes.md).

## Fonts

A diagram carries a list of font families, available as `fonts` in the diagram scope.
By default it contains Roboto, Open Sans and Source Code Pro, and the first entry is the font used
unless a `fontFamily` style says otherwise.

A font family is created with `fontFamily`, and each of its four faces with `font`:

```hyl
diagram {
    fonts.add(
        fontFamily(
            "My Font",
            normal = font("https://example.com/MyFont-Regular.ttf"),
            italic = font("https://example.com/MyFont-Italic.ttf"),
            bold = font("https://example.com/MyFont-Bold.ttf"),
            boldItalic = font("https://example.com/MyFont-BoldItalic.ttf")
        )
    )

    styles {
        type("span") {
            fontFamily = "My Font"
        }
    }
}
```

`font` optionally takes variation settings as a second argument, either the name of a named variation
or an object with values for the variation axes.

::: warning External fonts
Loading a font from a URL requires _External fonts_ to be enabled in the
[settings](./editor.md#diagram), as it makes the editor fetch data from a third party.
:::
