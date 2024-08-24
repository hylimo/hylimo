---
outline: deep
---

# Diagram DSL

HyLiMo provides several diagram type-independent features

## Diagram

Diagrams are a triple of a root element, styles and font families.
Diagrams can be created using the `createDiagram` function.
However, usually the `diagram` function is not used directly, but rather the `diagram` DSL function (or the diagram type-specific equivalent) is used:

```
diagram {
    // diagram content
}
```

The diagram must always be the returned value in the global scope and thus should usually be the last and/or only statement in the file.

## Elements

Elements are the building blocks of diagrams.
Different types of elements exist:

- rect: a rectangle with an optional content
- ellipse: an ellipse with an optional content
- path: an SVG path
- text: a text element containing at least one span
  - span: a span of text with associated styling
- vbox: stacks elements vertically
- hbox: stacks elements horizontally
- stack: stacks elements on the z-axis
- canvas: a canvas where elements and connections can be used
  - canvasElement: a container with a position on the canvas
  - points: three different types of points are supported
    - absolutePoint: a point with absolute coordinates
    - relativePoint: a point with coordinates relative to another point or canvasElement
    - linePoint: point on a canvasConnection or the outline of a canvasElement, defined by its relative position on the line, and an optional distance to the line
  - canvasConnection: connection between two canvas elements / points, consists of a list of segments, at least one
    - marker: element positioned at the start / end of the canvasConnection
    - canvasConnectionSegment: segments which make up the connection, three types of segments exist:
      - canvasLineSegemtn: straight line between two points
      - canvasBezierSegment: cubic bezier curve between two points using two control points
      - canvasAxisAlignedSegment: axis-aligned poly line, consisting of one to three line segments

Elements are usually used by developers to create new diagram types.
However, diagrammers can also use elements directly to extend the graphical appearance of their diagrams.
Each of these elements can be created as a function, which takes element type-specific parameters.
All these functions have in common, that they take a function as only positional argument, which is executed to create inner elements:

```
rect(fill = "green") {
    text {
        span(text = "Hello World")
    }
}
```

## Styles

Styling allows to manipulate the appearance of elements.
Available style attributes depend on the element type.
For example, shape-like elements provide `fill`, `fillOpacity`, `stroke`, `strokeWidth`, `strokeOpacity`, `strokeDash`, and `strokeDashSpace` attributes.
Layouted elements, including `vbox`, `hbox`, `stack`, `rect`, `ellipse` and `path` also provide attributes to affect their layouting:

- `width`, `minWidth`, and `maxWidth` for defining its width, here `width` takes precedence over `minWidth` and `maxWidth`
- `height`, `minHeight`, and `maxHeight` for defining its height, here `height` takes precedence over `minHeight` and `maxHeight`
- `margin`, and its variants `marginTop`, `marginRight`, `marginBottom`, and `marginLeft` for defining the margin around the element
- `vAlign` and `hAlign` for defining the vertical and horizontal alignment of the element within its parent

Style attributes can be set in two ways:
First, they can be defined directly on the element.
However, this makes styling more verbose and less reusable.
Therefore, styles can also be defined using the SCSS-inspired `styles` function:

```
styles {
    any {
        fill = "green"
    }
}
```

This function takes a function as only positional argument, which is executed to define the styles.
Selectors can be nested to limit to which elements the styles apply, similar to SCSS, selectors can be nested:.

```
styles {
    cls("class") {
        cls("title") {
            fontWeight = "bold"
        }
    }
}
```

Supported selectors include cls, which matches elements with a specific class, type, which matches elements of a specific type, and any, which matches all elements.

To support theming, CSS-inspired variables can be used in styles:

```
type("rect") {
    border = var("primary")
}
```

The value of variable can be defined in selectors:

```
any {
    variables.primary = "green"
}
```

Also, to define variables for nested elements, we provide the `vars` construct which wrapps set variables into an `any` selector:

```
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

## Canvas Constructs

Canvas is the most important diagram element for graph-based diagrams.
To allow separating layouting and styling from the contents of elements, and create a consistant user experience, inside `diagram` blocks, several constructs are available:

### `element` function

can be used to create a canvas element with some content:

```
element {
    text {
        span(text = "Hello World")
    }
}
```

### Point functions

- `apos`: creates an absolute point, takes x and y as arguments
- `rpos`: creates a relative point, takes target, x and y as arguments
- `lpos`: creates a line point, takes target, pos, and distance as arguments

### `styles` operator

Can be applied to any element to define element-specific styles:

```
rect() styles {
    fill = green
    any {
        fontSize = 10
    }
}
```

Also allows to set style classes:

```
rect() styles {
    class += "test-rect"
}
// is equivalent to
rect(class = list("test-rect"))
```

### `layout` operator

Can be used to set width, height and position of a canvasElement (**not** other diagram elements):

```
element {
    // some content
} layout {
    width = 100
    height = 100
    pos = apos(10, 20)
}
```

### `with` operator

Can be used to customize canvasConnections, by adding labels to the canvas connection and defining the segments using a custom fluent builder syntax:

```
aCanvasConnection with {
    over = start().line(apos(10, 20)).line(end())
    // a label in the middle of the connection with distance 100
    label("the text of the label", 0.5, 100)
}
```

The builder for creating the segments supports the following methods:

- start: starts the line, if the start element is a canvasElement takes the relative position on the outline as argument
  ```
  // canvas element start:
  start(0)
  // point start
  start()
  ```
- end: ends the line, if the end element is a canvasElement takes the relative position on the outline as argument
  ```
  // canvas element end
  end(0)
  // point end
  end()
  ```
- line: adds a line segment for each positional argument
  ```
  // 1 segment
  start(0).line(end(0))
  // 2 segments
  start(0).line(apos(100, 100), end(0))
  ```
- bezier: adds a bezier segment, first takes relative coordinates for the start control point, next the end point, and last the relative coordinates for the end control point. Also supports adding multiple segments at once by repeating the first two parameters for each segment, control points are mirrored at each inner point.
  ```
  // 1 segment
  over = start(0).bezier(100, 100, end(0), 100, 100)
  // 2 segments
  over = start(0).bezier(100, 100, apos(100, 100), 100, 100, end(0), 100, 100)
  ```
- axisAligned: adds an axis-aligned segment, takes the end point and a relative position between -1 and 1 for the center part of the segment. If the provided position is positive, the position defines the relative position of the vertical segment, if negative the relative position of the horizontal segment. Similar to other segment types, inputs can be repeated for multiple segments.
  ```
  // 1 segment, horizontal first
  over = start(0).axisAligned(0.5, end(0))
  // 1 segment, vertical first
  over = start(0).axisAligned(-0.5, end(0))
  // 2 segments
  over = start(0).axisAligned(0.5, apos(100, 100), -0.5, end(0))
  ```

Label allows to create a label on the connection.
The function takes the text to display, the relative position on the connection, and the distance to the connection as arguments.
