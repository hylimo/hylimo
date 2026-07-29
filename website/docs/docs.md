---
outline: deep
---

# HyLiMo

HyLiMo is a hybrid diagram editor: a textual DSL for diagrams, and an editor in which the text and
the picture are two views of the very same diagram.
Type, and the picture follows.
Drag, and the text follows.

Diagrams are plain text files (`.hyl`), so they can be reviewed, diffed and versioned like any other
source file - while everything that is genuinely visual (where a box sits, how a connection bends)
stays a matter of dragging it into place.

::: tip Everything here is editable
Many code blocks in this documentation are live editors.
Change the code and the diagram re-renders; drag something in the diagram and the code is rewritten
for you.
Nothing is saved to the page, so feel free to break things - reload to get the original back.
:::

## Hybrid editing in one example

The diagram below is the complete definition of a small class diagram.
Try it: drag the `Actor` class around, drag the middle of the connection, or double-click an element
to jump to the code which defines it.

```hylimo
classDiagram {
    class("Movie") {
        public {
            title : String
        }
    }

    class("Actor") layout {
        pos = rpos(Movie, 400, 0)
    }

    Actor -- Movie with {
        over = start(Position.Left).line(end(Position.Right))
        label("plays in", 0.5, -25)
    }
}
```

Two things are worth noticing.
First, the diagram never contains coordinates you did not ask for: `Actor` is placed _relative to_
`Movie`, and moving `Movie` takes `Actor` with it.
Second, the graphical editor did not add a hidden layout file - `pos = rpos(Movie, 400, 0)` is the
whole layout information, and it is right there in the source.

## Why text

- **Reviewable and versionable** - a diagram change is a diff, not a binary blob.
- **Reusable** - [SyncScript](./syncscript.md) is a real programming language: extract a recurring
  construct into a function, loop over a list of elements, compute positions.
- **Consistent** - [styles](./diagram.md#styles) work like SCSS and apply to a whole class of
  elements at once, instead of being reapplied by hand per element.
- **Themeable** - colors and sizes are [variables](./diagram.md#style-variables), so the same source
  renders in light and dark mode.

## Why a graphical editor

Writing coordinates by hand is miserable, and reading a diagram as text is not the point of a
diagram.
So the graphical editor is not a preview: it is an editor, and every graphical edit is translated
back into a source edit.

- Move, resize and rotate elements, drag connections into shape, split a connection into segments.
- Create elements and connections from the toolbox.
- Snapping, a grid and gap snapping keep things aligned without micromanaging numbers.
- Undo/redo is shared: `Ctrl` + `Z` undoes graphical and textual edits alike, because there is only
  one document.

The [Hybrid Editor](./editor.md) page describes all of this in detail.

## The three layers of the language

A `.hyl` file is a program which evaluates to a diagram.
It is written in three layers, each one built on the layer below:

| Layer                         | What it gives you                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [SyncScript](./syncscript.md) | The language itself: values, functions, objects, control flow. No diagram-specific concept at all.                      |
| [Diagram DSL](./diagram.md)   | Diagram-independent building blocks: elements, [shapes](./shapes.md), styles, canvases, points and connections.         |
| Diagram type DSLs             | The vocabulary of a concrete notation: [`classDiagram`](./class.md), [`sequenceDiagram`](./sequence.md) and the others. |

Most of the time you work in the topmost layer, which reads like a notation-specific language:

```hyl
classDiagram {
    class("Movie")
}
```

Nothing stops you from reaching down, though: the layers are not walls.
The following diagram mixes all three - a UML class, a hand-made shape, and a function which creates
several of them:

```hylimo
classDiagram {
    class("Movie")

    tag = {
        (label, y) = args
        element(shape(shape = defaultShapes.note) {
            text {
                span(text = label)
            } styles {
                hAlign = HAlign.Center
                vAlign = VAlign.Center
            }
        }) layout {
            pos = apos(320, y)
            width = 150
            height = 70
        }
    }

    tag("planned", -70)
    tag("in review", 30)

    styles {
        type("shape") {
            fill = var("background")
        }
    }
}
```

## Diagram types

| Diagram type                              | Function            |
| ----------------------------------------- | ------------------- |
| [UML class diagram](./class.md)           | `classDiagram`      |
| [UML component diagram](./component.md)   | `componentDiagram`  |
| [UML sequence diagram](./sequence.md)     | `sequenceDiagram`   |
| [UML activity diagram](./activity.md)     | `activityDiagram`   |
| [UML deployment diagram](./deployment.md) | `deploymentDiagram` |
| [General UML diagram](./uml.md)           | `umlDiagram`        |
| [Anything else](./diagram.md)             | `diagram`           |

Each diagram type comes with its own toolbox, its own set of graphical edits and its own style
variables.
`umlDiagram` combines all UML elements except the sequence diagram ones, and `diagram` is the plain
canvas the others are built on.

## Ways to use HyLiMo

### The web editor

<https://hylimo.github.io> is the editor these docs are built around.
It is a progressive web app: it runs entirely in your browser - there is no server which sees your
diagrams - it works offline once loaded, and it can be installed like a native app, including opening
`.hyl` files directly.
Diagrams live in the browser's storage, can be saved to disk, exported as SVG or PDF, and shared as a
link which contains the compressed source.

### The command line

`@hylimo/cli` renders a `.hyl` file to SVG or PDF, which is what you want in a build pipeline:

```sh
npx @hylimo/cli --input diagram.hyl --output diagram.svg
```

| Option                      | Meaning                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `-f`, `--input <file>`      | The `.hyl` file to render                                       |
| `-o`, `--output <file>`     | Output file, `.svg` or `.pdf` selects the format                |
| `--dark`                    | Render in dark mode                                             |
| `--primary <color>`         | Stroke and text color, defaults to black (light) / white (dark) |
| `--background <color>`      | Background color, defaults to white (light) / black (dark)      |
| `--text-as-path`            | Render text as paths instead of embedding fonts, SVG only       |
| `--disable-font-subsetting` | Embed complete fonts instead of only the used glyphs            |
| `--enable-external-fonts`   | Allow loading fonts from external URLs                          |

### Embedded in another application

The editor can be embedded in an iframe by adding the `embedded` query parameter.
In this mode it does not use the browser storage: the host application provides the diagram and
receives `saveDiagram` and `requestExit` messages via `postMessage`.

## How it fits together

The editor is a language client, and everything that understands the language lives in a language
server - in the web app, that server runs in a web worker next to the editor.

```hylimo
componentDiagram {
    styles {
        type("shape") {
            fill = var("background")
        }
    }

    editor = component("Editor") {
        textEditor = component("Text editor")
        component("Graphical editor") layout {
            pos = rpos(textEditor, 0, 90)
        }
    }

    server = component("Language server") {
        interpreter = component("Interpreter")
        component("Layout engine") layout {
            pos = rpos(interpreter, 0, 90)
        }
    } layout {
        pos = rpos(editor, 700, 0)
    }

    editor --> server with {
        over = start(0.94).line(end(0.56))
        label("document & graphical edits", 0.5, 25)
    }

    server --> editor with {
        over = start(0.44).line(end(0.06))
        label("diagram, completions, diagnostics", 0.5, 25)
    }
}
```

A graphical edit therefore takes the following route: the graphical editor sends a _what changed_
description to the language server, the language server turns it into a concrete text edit, the text
document changes, and the changed document is interpreted, laid out and sent back as a new diagram.
This is why graphical edits appear in the undo stack of the text editor, and why they can only do
what the source allows - an element whose position is computed by a function cannot be dragged to an
arbitrary place.

### Packages

The implementation is split into packages, all in the
[hylimo/hylimo](https://github.com/hylimo/hylimo) repository:

| Package                         | Responsibility                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `@hylimo/core`                  | SyncScript: lexer, parser, interpreter                                               |
| `@hylimo/diagram`               | Diagram DSL, the diagram types, and the layout engine                                |
| `@hylimo/diagram-common`        | The rendered diagram model, shared between server, renderers and UI                  |
| `@hylimo/diagram-protocol`      | The LSP extensions used for diagram rendering and graphical edits                    |
| `@hylimo/language-server`       | Language server: diagnostics, completion, formatting, rendering, edit generation     |
| `@hylimo/diagram-ui`            | The graphical editor, based on [Sprotty](https://github.com/eclipse-sprotty/sprotty) |
| `@hylimo/diagram-render-svg`    | SVG renderer                                                                         |
| `@hylimo/diagram-render-pdf`    | PDF renderer                                                                         |
| `@hylimo/monaco-editor-support` | Syntax highlighting and language configuration for the Monaco based text editor      |
| `@hylimo/fonts`                 | The bundled default fonts                                                            |
| `@hylimo/wasm-libs`             | Text shaping (HarfBuzz) and SVG path simplification                                  |
| `@hylimo/cli`                   | Command line renderer                                                                |

All packages are MIT licensed, except `@hylimo/diagram-ui`, which is EPL-2.0.

::: info Documentation status
These pages document how to _use_ HyLiMo.
For the internals - the interpreter, the layout engine, the edit generation - the code documentation
in the repository is the reference.
:::

## Where to go next

| If you want to …                                        | Read                                             |
| ------------------------------------------------------- | ------------------------------------------------ |
| know what the editor can do, and which shortcut does it | [Hybrid Editor](./editor.md)                     |
| understand the language the diagrams are written in     | [SyncScript](./syncscript.md)                    |
| style, position or extend diagrams, or build your own   | [Diagram DSL](./diagram.md)                      |
| know which shapes exist and how they size themselves    | [Shapes](./shapes.md)                            |
| draw a concrete UML diagram                             | the diagram type pages, e.g. [class](./class.md) |

## Gallery

Every diagram type comes with a complete example.
Pick one to open it in the editor - it is the same diagram as on the page of its diagram type, and
just as editable as everything else here.

<DiagramGallery />
