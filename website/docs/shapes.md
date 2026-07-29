---
outline: deep
---

# Shapes

A **shape** is a parametric graphic: an outline whose every coordinate is an affine function of the
element's box (`w`, `h`) and its `cornerRounding` style (`r`). A single `shape` element replaces the
old `rect` and `ellipse` primitives — the outline is described by a `path`, so any silhouette is
possible, and an optional stroke-only `decoration` adds the internal detail of a compound shape (a
database rim, a note crease).

Shapes lay out like the shapes they replace: size the element (via a `layout` block or a
`width`/`height` style) and the outline fills it, or add content and the shape grows to fit it.

Both directions are solved for the outline as it actually is, never for its bounding box. Given a
size, the content goes into the largest-area rectangle that fits inside the outline, clear of the
stroke and of any decoration. Given content, the shape becomes the smallest one — by area — that
still holds it, which is why an ellipse settles around `√2` times its content, a diamond around twice
it, and a chevron stays exactly as flat as its content: every bit of extra height would be paid for
twice over in width by its point and notch.

To fill a shape with the diagram background (so it stays readable in both light and dark themes) use
the `background` style variable rather than a fixed color like `"white"`. The examples below set it
once per diagram via `type("shape") { fill = var("background") }`.

In every example the shape wraps a **thin dashed rectangle** with no size of its own, so it expands to
fill the content region — showing exactly where and how large the fitted content box is. The size is
given to the surrounding `element` with a `layout` block, not to the shape itself.

```hylimo
diagram {
    element(shape(shape = defaultShapes.rect) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 140
        height = 70
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

## Predefined shapes

The `defaultShapes` object is available in every diagram and provides ready-made shape definitions.
Pass one as the `shape` attribute: `shape(shape = defaultShapes.<name>)`. Available shapes: `rect`,
`ellipse`, `circle`, `diamond`, `hexagon`, `parallelogram`, `note`, `box3d`, `database`, `chevron`,
`chevronStart`, and `chevronEnd`.

Each shape below is shown once, with the dashed content box filling it. Where a shape reacts to the
`cornerRounding` style (currently the rectangle), a rounded variant is shown as well.

### Rectangle

The rectangle honours the `cornerRounding` style; the rounded corners collapse to sharp when it is
`0` (the default).

```hylimo
diagram {
    element(shape(shape = defaultShapes.rect) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 130
        height = 60
    }
    element(shape(shape = defaultShapes.rect, cornerRounding = 14) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        pos = apos(200, 0)
        width = 130
        height = 60
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Ellipse

`ellipse` fills the box; the content is fitted to the curve, so it never pokes out of the sides.

```hylimo
diagram {
    element(shape(shape = defaultShapes.ellipse) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 160
        height = 80
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Circle

`circle` is the same outline as `ellipse`, meant for an equal `width`/`height`.

```hylimo
diagram {
    element(shape(shape = defaultShapes.circle) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 100
        height = 100
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Diamond

Useful for decisions and gateways. The content box is the largest rectangle inscribed in the slanted
outline.

```hylimo
diagram {
    element(shape(shape = defaultShapes.diamond) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 170
        height = 100
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Hexagon

A six-sided shape, often used for a process or preparation step.

```hylimo
diagram {
    element(shape(shape = defaultShapes.hexagon) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 160
        height = 80
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Parallelogram

A slanted box, commonly used for input and output.

```hylimo
diagram {
    element(shape(shape = defaultShapes.parallelogram) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 160
        height = 80
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Note

A rectangle with a folded corner; the fold crease is drawn as a `decoration`.
The fold has a fixed size of 20 pixels instead of scaling with the box, so a note stays a note at
every size — which also means the shape only makes sense from about twice that in each direction.

```hylimo
diagram {
    element(shape(shape = defaultShapes.note) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 140
        height = 90
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### 3D box

A box drawn in perspective, the notation UML uses for a node. Its two hidden edges are a
`decoration`, which is what keeps the content inside the front face: the content box is the largest
rectangle clear of every stroke, and the front face is exactly that.
Like the note's fold, the depth is a fixed 20 pixels rather than a share of the box, so the shape
only makes sense from about twice that in each direction.

```hylimo
diagram {
    element(shape(shape = defaultShapes.box3d) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 160
        height = 100
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Database

A cylinder whose front rim is a `decoration`; the content is placed below the rim automatically.

```hylimo
diagram {
    element(shape(shape = defaultShapes.database) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 130
        height = 110
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

### Chevron

`chevron` carries a point on the right and a matching notch on the left, so a row of them interlocks
into a process chain. `chevronStart` has only the point (its left edge stays flat, for the first block
of such a chain), `chevronEnd` only the notch (its right edge stays flat, for the last one). Point and
notch are always `h/2` deep, which makes the blocks fit together at any height.

```hylimo
diagram {
    element(shape(shape = defaultShapes.chevronStart) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 150
        height = 60
    }
    element(shape(shape = defaultShapes.chevron) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        pos = apos(126, 0)
        width = 150
        height = 60
    }
    element(shape(shape = defaultShapes.chevronEnd) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        pos = apos(252, 0)
        width = 150
        height = 60
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

## Custom shapes

A shape definition is an object with a `path` and an optional `decoration`, both SVG-like path
strings. Every coordinate, Bézier control and arc radius is an **affine expression** over the box
width `w`, the box height `h`, and the corner rounding `r` (`+ - * /`, parentheses, and implicit
multiplication like `0.5h`); the arc rotation and flags are plain constants. Supported commands are
`M`, `L`, `H`, `V`, `C` (cubic Bézier), `Q` (quadratic Bézier), `A` (elliptical arc) and `Z`.

The outline is stroked and filled; the `decoration` is only ever stroked. A segment of zero length is
dropped, so a corner drawn with an `r`-radius arc simply disappears when `cornerRounding` is `0`.

A tag/label with a rounded end whose radius follows `cornerRounding`:

```hylimo
diagram {
    element(shape(
        shape = [path = "M w,h/2 L w,h-r A r,r 0 0,1 w-r,h L 0,h L 0,0 L w-r,0 A r,r 0 0,1 w,r L w,h/2 Z"],
        cornerRounding = 16
    ) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 140
        height = 60
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```

A document — the classic flowchart symbol — whose wavy lower edge is a single cubic Bézier (`C`). The
content box is fitted above the wave, clear of the curve:

```hylimo
diagram {
    element(shape(
        shape = [path = "M 0,0 L w,0 L w,0.82h C 0.72w,0.66h 0.28w,h 0,0.82h Z"]
    ) {
        shape(shape = defaultShapes.rect, class = list("content-box"))
    }) layout {
        width = 150
        height = 90
    }
    styles {
        type("shape") {
            fill = var("background")
        }
        cls("content-box") {
            fill = "none"
            strokeWidth = 1
            strokeDash = 4
        }
    }
}
```
