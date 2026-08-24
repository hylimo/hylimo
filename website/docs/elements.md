---
outline: deep
---

# Elements

An element is the basic building block of a diagram.
[The DSL page](./diagram.md) describes how elements are combined into a diagram; this page documents the elements themselves: their attributes, their styles, and the contents they accept.

There are sixteen element types, in two groups.
Layout elements (`container`, `shape`, `divider`, `text`, `span` and `path`) are boxes: each is measured and then placed by its parent.
Canvas elements (`canvas` and everything placed on one) are positioned by coordinates and connected to each other.

## Calling an element

Each element is created by a function of the same name.
Attributes are passed as named arguments, contents either as a `contents` list or in a trailing lambda:

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

Both content forms produce the same element, so `text { span(text = "a") }` is equivalent to `text(contents = list(span(text = "a")))`.

## Attribute sources

An attribute can be set in three ways: as a named argument, in a `styles` block applied to the element, or in a style rule which matches the element by type or class.

```hyl
// as an argument
span(text = "Hello", fontWeight = "bold")

// in a styles block on this element
span(text = "Hello") styles {
    fontWeight = "bold"
}

// in a rule matching every span
styles {
    type("span") {
        fontWeight = "bold"
    }
}
```

Only style attributes can be set by the second and third form.
The remaining attributes are structural, such as a shape's `shape`, a span's `text` or a line point's `lineProvider`, and have to be passed as arguments.
The tables below list the two kinds separately.
See [Styles](./diagram.md#styles) for selectors, precedence and style variables.

::: warning Undeclared attributes are ignored
Attribute values are type checked, so `text(width = "abc")` reports that `width` must be a number.

Attribute names are not checked against the element type.
`text(padding = 10)`, and equally a `type("text") { padding = 10 }` rule, is accepted and has no effect, because `text` does not declare `padding`.
No diagnostic is reported in that case, so the tables below are the reference for which attributes an element supports.
:::

## Contents

The permitted contents of an element are defined by the type of its `contents` attribute, so invalid nesting is reported as a type error.

| Element                                     | May contain                                                                        | Cardinality |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ----------- |
| `container`                                 | `canvas`, `text`, `shape`, `path`, `container`                                     | 0..\*       |
| `shape`                                     | the same, plus `divider`                                                           | 0..\*       |
| `canvasElement`                             | the same as `container`                                                            | 0..\*       |
| `marker`                                    | the same as `container`                                                            | 0..\*       |
| `text`                                      | `span`                                                                             | 0..\*       |
| `canvas`                                    | `canvasElement`, `canvasConnection`, `absolutePoint`, `relativePoint`, `linePoint` | 0..\*       |
| `canvasConnection`                          | `canvasLineSegment`, `canvasBezierSegment`, `canvasAxisAlignedSegment`, `marker`   | 1..\*       |
| `span`, `divider`, `path`, segments, points | nothing                                                                            | 0           |

Two entries of this table have further consequences:

- A `divider` is valid only as a direct child of a `shape`.
  No other content type includes it, `container` in particular does not, so no additional check is required.
- A `canvas` is a regular content element and can be placed wherever a `shape` or a `container` can.
  Nested canvases are the basis for UML packages and swimlanes.

## Style attribute groups

The following groups of style attributes are shared between elements, and are referred to by name in the element sections below.

**Size**: `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`.
`width` and `height` take precedence over the corresponding minimum and maximum.

**Alignment**: `hAlign` (`"left"`, `"right"`, `"center"`) and `vAlign` (`"top"`, `"bottom"`, `"center"`) position the element within the space assigned to it by its parent.
The `HAlign` and `VAlign` enum objects provide the values, so `HAlign.Center` can be used instead of `"center"`.

**Margin**: `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`.
A margin is space around the element which its siblings have to accommodate.

**Flex**: `base`, `grow` and `shrink` control how the element takes up the remaining space along the primary axis of an `hbox` or `vbox`, analogous to the flexbox properties of the same name.

**Visibility**: `visibility` is `"visible"`, `"hidden"` (not rendered, space retained) or `"collapse"` (not rendered, no space).
The `Visibility` enum object provides the values.

**Contents**: `layout` is `"stack"` (the default, children on the z-axis), `"vbox"` or `"hbox"`.
`padding` is space between the element and its contents.
In contrast to a margin, padding belongs to the element itself: the element grows by it and its contents are inset by it.

**Stroke**: `stroke` (a color), `strokeOpacity`, `strokeWidth`, `strokeDash` and `strokeDashSpace` for dashed strokes, and `strokeLineJoin`, `strokeLineCap` and `strokeMiterLimit` for how corners and ends are drawn.
No stroke is drawn unless `stroke` is set.

**Fill**: `fill` (a color) and `fillOpacity`.
For elements which are meant to hide what is behind them, use the `background` style variable instead of a fixed color, so that they render correctly in both themes.

Support by element:

| Element                 | Size | Align | Margin | Flex | Visibility | Contents | Stroke | Fill |
| ----------------------- | ---- | ----- | ------ | ---- | ---------- | -------- | ------ | ---- |
| `container`             | yes  | yes   | yes    | yes  | yes        | yes      | no     | no   |
| `shape`                 | yes  | yes   | yes    | yes  | yes        | yes      | yes    | yes  |
| `divider`               | no   | no    | yes    | no   | yes        | no       | partly | no   |
| `text`                  | yes  | yes   | yes    | yes  | yes        | no       | no     | no   |
| `span`                  | no   | no    | no     | no   | no         | no       | no     | yes  |
| `path`                  | yes  | yes   | yes    | yes  | yes        | no       | yes    | yes  |
| `canvas`                | yes  | yes   | yes    | yes  | yes        | no       | no     | no   |
| `canvasElement`         | yes  | yes   | no     | no   | yes        | yes      | no     | no   |
| `canvasConnection`      | no   | no    | no     | no   | no         | no       | yes    | no   |
| `marker`                | yes  | yes   | yes    | yes  | yes        | yes      | no     | no   |
| the segments and points | no   | no    | no     | no   | no         | no       | no     | no   |

The `divider` entry is partial: it supports `stroke`, `strokeOpacity`, `strokeWidth`, `strokeDash` and `strokeDashSpace`, but not `strokeLineJoin`, `strokeLineCap` or `strokeMiterLimit`, see [below](#divider).

`class` is supported by every element.
It is not a style attribute, but the attribute style rules select on.

## Layout elements

### `container`

A box which lays out its children and has no appearance of its own.

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

Styles: Size, Align, Margin, Flex, Visibility, Contents.

### `shape`

A parametric graphic, such as a rectangle, ellipse, diamond or database, whose outline is fitted to its content or its content to the outline.
See [Shapes](./shapes.md).

| Attribute | Meaning                                                                    |
| --------- | -------------------------------------------------------------------------- |
| `shape`   | the shape definition: an object with a `path` and an optional `decoration` |

| Style            | Meaning                                                     |
| ---------------- | ----------------------------------------------------------- |
| `cornerRounding` | the corner rounding radius, usable as `r` in the shape path |

Styles: `cornerRounding`, Size, Align, Margin, Flex, Visibility, Contents, Stroke, Fill.

### `divider`

A rule drawn across the interior of a `shape`, terminating exactly at its border and at every decoration in its way.
It has no attributes of its own: the shape it belongs to, its orientation and its extent all follow from its position in the tree.
See [Dividers](./shapes.md#dividers).

Styles: Margin, Visibility, and `stroke`, `strokeOpacity`, `strokeWidth`, `strokeDash` and `strokeDashSpace`.
`strokeLineJoin`, `strokeLineCap` and `strokeMiterLimit` are not supported, as a divider is a straight line which ends where the border of the shape does.
It has no size, alignment or flex attributes either: it spans the space the shape leaves it, and never increases the size of the shape.

### `text`

A block of text consisting of one or more `span`s.
Each span carries its own font styling, which allows mixed formatting within one text:

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

| Style       | Meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `direction` | `"horizontal"` (the default), `"clockwise"` (reading top to bottom) or `"counterclockwise"` |

`direction` rotates the text by a quarter turn.
Reading order is preserved and the measurements are transposed: a turned text reports its line height as width and its line length as height.
A vertical swimlane header in a horizontal row is placed this way, without any change to the surrounding layout.

```hylimo
diagram {
    element(container(layout = "hbox") {
        text {
            span(text = "horizontal")
        } styles {
            marginRight = 30
        }
        text(direction = "clockwise") {
            span(text = "clockwise")
        } styles {
            marginRight = 30
        }
        text(direction = "counterclockwise") {
            span(text = "counterclockwise")
        }
    })
}
```

Styles: `direction`, Size, Align, Margin, Flex, Visibility.
A text has neither fill nor stroke; the color is set on its spans.

### `span`

A run of text with its own font styling.
It is the only element which carries font attributes.

| Attribute | Meaning             |
| --------- | ------------------- |
| `text`    | the text to display |

| Style                                                                                                        | Meaning                            |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `fontFeatureSettings`                                   | which font is used and how         |
| `underline`, `underlineOpacity`, `underlineWidth`, `underlineDash`, `underlineDashSpace`                     | an underline and its appearance    |
| `strikethrough`, `strikethroughOpacity`, `strikethroughWidth`, `strikethroughDash`, `strikethroughDashSpace` | a strikethrough and its appearance |

`fontWeight` is `"normal"` or `"bold"`, `fontStyle` is `"normal"` or `"italic"`, and `fontFamily` must name one of the diagram's [registered families](./diagram.md#fonts).
`underline` and `strikethrough` take a color, or `true` to use the fill color.

Styles: the above and Fill, which is the color of the text.
A span has no size, margin or alignment of its own; it is laid out within its `text`.

### `path`

An SVG path, scaled into the space assigned to the element.

| Attribute | Meaning             |
| --------- | ------------------- |
| `path`    | the SVG path string |

| Style     | Meaning                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| `stretch` | `"fill"` (the default) scales each axis independently, `"uniform"` keeps the aspect ratio |

```hylimo
diagram {
    element(container(layout = "hbox") {
        path(path = "M 0 0 L 1 1 L 2 0", stretch = "fill", class = list("mark")) styles {
            marginRight = 30
        }
        path(path = "M 0 0 L 1 1 L 2 0", stretch = "uniform", class = list("mark"))
    })
    styles {
        cls("mark") {
            width = 160
            height = 50
            stroke = "#e2574c"
            strokeWidth = 3
        }
    }
}
```

Styles: `stretch`, Size, Align, Margin, Flex, Visibility, Stroke, Fill.

A path is not fitted to content and cannot contain any.
For a graphic which holds content and grows with it, use a [custom shape](./shapes.md#custom-shapes) instead.

## Canvas elements

A canvas positions its contents by coordinates instead of laying them out, and connects them.
The [canvas constructs](./diagram.md#canvas-constructs) `element`, `apos`, `rpos`, `lpos`, `layout` and `with` are the usual way to create the elements documented in this section.

### `canvas`

The element which holds positioned content.
The body of every `diagram` is a canvas, and since a canvas is a regular content element, canvases can be nested.

| Attribute  | Meaning                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `syncWith` | join the coordinate group anchored at another canvas: `[canvas = <a canvas>, x = true, y = true]` |

By default a canvas reports exactly the bounds of its contents, so two sibling canvases with different content have different sizes and unrelated origins.
`syncWith` overrides this along the selected axes: every member of a group adopts the origin and extent of the group there, so the coordinate systems of the members align and their sizes agree.
Swimlanes are built on this, and use it to share the flow axis between all lanes.

The referenced canvas has to be an ancestor of the canvas which declares `syncWith`; any other reference is reported as an error.
A canvas measures all of its contents before laying any of them out, and that ordering is what allows a group to be resolved in two passes.
Only an ancestor guarantees it.

Group membership is declared by the member, and is not derived from nesting.
A canvas nested inside a group member, such as a package drawn inside a swimlane, therefore keeps its own size.

Styles: Size, Align, Margin, Flex, Visibility.

### `canvasElement`

Content positioned on a canvas, created by `element { … } layout { … }`.

| Attribute | Meaning                                  |
| --------- | ---------------------------------------- |
| `pos`     | the position: a point element, or `null` |

| Style      | Meaning                 |
| ---------- | ----------------------- |
| `rotation` | the rotation in degrees |

Styles: `rotation`, Size, Align, Visibility, Contents.
Margin and flex attributes are not supported, as a canvas positions the element by coordinates rather than relative to siblings.

::: details `source` and `editExpression`
Both are set by the DSL and hold the metadata the graphical editor requires to write a change back into the source.
They are not intended to be set manually.
:::

### `canvasConnection`

A connection between two points, consisting of one or more segments.
See [the `with` operator](./diagram.md#with-operator) for how one is usually built.

| Attribute     | Meaning                            |
| ------------- | ---------------------------------- |
| `start`       | the point the connection starts at |
| `startMarker` | the marker at the start, if any    |
| `endMarker`   | the marker at the end, if any      |

The contents are the segments of the connection, of which there is at least one.
Segments are chained: each segment defines only its `end`, its start being the end of the preceding segment, or `start` in case of the first segment.

Styles: Stroke.

### The segments

| Element                    | Attributes                                    | Meaning                                         |
| -------------------------- | --------------------------------------------- | ----------------------------------------------- |
| `canvasLineSegment`        | `end`                                         | a straight line                                 |
| `canvasBezierSegment`      | `end`, `startControlPoint`, `endControlPoint` | a cubic bezier curve                            |
| `canvasAxisAlignedSegment` | `end`, `verticalPos`                          | an axis-aligned poly line of one to three parts |

`verticalPos` is clamped to the range -1 to 1.
A positive value is the relative position of the vertical part of the segment, a negative value the relative position of the horizontal part.
The sign therefore selects whether the segment runs horizontally or vertically first.

Segments have no styles of their own; a connection is styled as a whole.

### The points

A point has no size and is never rendered.
`apos`, `rpos` and `lpos` create the three kinds.

| Element         | Attributes           | Styles               |
| --------------- | -------------------- | -------------------- |
| `absolutePoint` | none                 | `x`, `y`             |
| `relativePoint` | `targetX`, `targetY` | `offsetX`, `offsetY` |
| `linePoint`     | `lineProvider`       | `pos`, `distance`    |

The coordinates are declared as style attributes, so a point can be moved by a style rule or a class like any other styled property, and the graphical editor writes a moved point back the same way it writes a color.

A `relativePoint` references its target separately per axis.
`targetX` and `targetY` are usually the same element, which is what `rpos` produces, but may also be two different ones, in which case the point follows one element horizontally and another vertically.
Both offsets default to 0.

A `linePoint` is positioned on the outline of a `canvasElement` or along a `canvasConnection`.
`pos` is the relative position on that line, between 0 and 1; the `Position` enum object provides the eight compass positions of an outline, so `Position.TopRight` can be used instead of `0.875`.
`pos` also accepts a pair of `(segment, position within that segment)`, which addresses a specific segment of a multi-segment connection.
`distance` offsets the point perpendicular to the line and defaults to 0.

The line provider has to be part of the same canvas as the point, or of a canvas nested inside it.

### `marker`

Content placed at the start or end of a connection, such as an arrow head, a diamond or a cross.

| Style       | Meaning                                                                     | Default |
| ----------- | --------------------------------------------------------------------------- | ------- |
| `refX`      | the x coordinate of the reference point, as a fraction of the marker width  | 1       |
| `refY`      | the y coordinate of the reference point, as a fraction of the marker height | 0.5     |
| `lineStart` | the relative (0..1) offset within the marker at which the line starts       | 0       |

The reference point is placed at the endpoint of the connection.
`lineStart` defines where the stroke of the connection ends within the marker: 0 for a closed marker the line must not enter, such as a filled triangle, and 1 for an open marker the line runs through to the tip, such as an arrow head.

```hylimo
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
        pos = apos(260, 0)
    }

    -- = internal.createConnectionOperator(
        endMarkerFactory = {
            marker(contents = list(
                path(path = "M 0 0 L 10 6 L 0 12 Z", class = list("tip"))
            ))
        }
    )

    a -- b with {
        over = start(Position.Right).line(end(Position.Left))
    }

    styles {
        cls("tip") {
            width = 20
            height = 20
            fill = var("primary")
        }
    }
}
```

Styles: `refX`, `refY`, `lineStart`, Size, Align, Margin, Flex, Visibility, Contents.
