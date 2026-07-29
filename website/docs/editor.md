---
outline: deep
---

# Hybrid Editor

The editor shows a diagram twice: as text on the left, and as a picture on the right.
Both are views of the same document, and both can be edited.
The picture is not generated _from_ the text once and then detached - every graphical edit is turned
back into a text edit, so the text always is the diagram.

::: tip
The embedded editors in this documentation are the same editor, only smaller.
Everything described here can be tried out directly on the diagram type pages.
:::

## The workspace

| Area           | What it is                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| Left pane      | The [textual editor](#textual-editor), based on Monaco (the editor of VS Code) |
| Right pane     | The [graphical editor](#graphical-editor), including the toolbox               |
| Divider        | Drag it to give one side more room                                             |
| Navigation bar | Diagram selection, share link, save, download and settings                     |

The panes are side by side, and switch to stacked on narrow, tall screens such as a phone in portrait
mode.

## Textual editor

The textual editor is a full language client - the language server which powers it also renders the
diagram, so both views always agree on what the document means.

- **Syntax highlighting**
- **Auto-completion**, including documentation for functions, parameters and style attributes.
  Completion is offered where a value is expected, so it knows about the elements and the styles of
  the diagram type you are using.
- **Error highlighting** for lexer, parser, interpreter and layout errors, as squiggles in the text
  and, where possible, at the position which caused them.
- **Auto-formatting** of the whole document (`Shift` + `Alt` + `F`), which also normalizes
  indentation of nested blocks.
- **Reveal**: double-clicking an element in the diagram selects the expression which created it.

Because the document is an ordinary text document, everything you expect from a code editor works:
multiple cursors, find and replace, and an undo stack which also contains all graphical edits.

## Graphical editor

### Navigating the canvas

| Action          | How                                                                     |
| --------------- | ----------------------------------------------------------------------- |
| Zoom            | Mouse wheel or trackpad pinch                                           |
| Pan             | Drag the empty canvas, hold `Space` and drag, or drag with middle mouse |
| Pan (hand tool) | Select the hand tool in the toolbox, then drag anywhere                 |
| Fit diagram     | `Ctrl` + `Shift` + `F`                                                  |
| Center diagram  | `Ctrl` + `Shift` + `C`                                                  |

### Selecting

Click an element to select it, `Ctrl` + click to add or remove an element from the selection.
The box select tool selects everything inside a dragged rectangle; holding `Shift` while starting the
box keeps the current selection.

### Moving, resizing and rotating

Selected elements can be dragged.
What can be moved, and how far, follows from the source: an element positioned with `apos` moves
freely, an element positioned with `rpos` moves relative to its target, and an element whose position
is computed cannot be dragged at all.

Resizing works by dragging the border or a corner of a selected element, rotating by dragging the
rotate handle shown next to it.
Both write plain numbers into the `layout` block of the element.

### Snapping

While dragging, the editor snaps to the grid, to other elements and to gaps between elements, and
shows snap lines for what it snapped to.
Hold `Alt` while dragging to invert this: with snapping enabled it drags freely, with snapping
disabled it snaps.
Grid and snapping can be turned off entirely in the [settings](#settings).

How precise the resulting numbers are is a setting as well - by default, positions and sizes are
rounded to whole pixels, so the source stays readable.

### Connections

- **Creating**: select the connect tool, pick the connection operator to use, then drag from the
  source element to the target element.
- **Shaping**: drag the connection to move it, drag its points to reroute it.
  The points of an axis-aligned connection only move along their axis.
- **Splitting**: `Shift` + click on a selected connection inserts a new point at that position,
  splitting the segment into two.
- **Line points**: points which sit on an element outline or on another connection are dragged along
  that line; hold `Shift` to keep the distance to the line fixed and only change the position on it.
- **Labels**: labels of a connection are dragged like any other element, which changes their relative
  position and distance.

### Toolbox

The toolbox sits in the corner of the graphical editor and is opened and closed with the pencil
button.

| Tool        | What it does                                                                              |
| ----------- | ----------------------------------------------------------------------------------------- |
| Hand        | Dragging pans the canvas instead of moving elements                                       |
| Default     | Select, move, resize and rotate                                                           |
| Add element | Shows the elements which can be added, click or drag one onto the canvas to add it        |
| Connect     | Shows the connection operators of the diagram type, drag from source to target to connect |
| Box select  | Drag a rectangle to select everything inside it                                           |

Clicking the active add-element or connect tool again locks it, so it stays active after use and you
can add several elements in a row - a small lock is shown on the tool.

The element list is grouped and searchable, and each entry shows a preview of what will be added.
The preview is not a picture drawn for the toolbox: it is the actual diagram, rendered by the
language server as if the edit had already been applied.

If exactly one element is selected, the toolbox offers what can be added _to that element_ - a port
on a component, a member on a class - instead of what can be added to the diagram.

### Reaching the source

Double-click an element, or `Alt` + click it, to select the expression which created it in the text
editor.
This is the fastest way from _this box here_ to the place in the source which is responsible for it.

## Undo and redo

`Ctrl` + `Z` and `Ctrl` + `Y` (or `Ctrl` + `Shift` + `Z`) work in both panes and share one history,
because a graphical edit is a text edit.
A drag is a single undo step, no matter how many intermediate positions were rendered while dragging.

## Settings

The settings are opened with the gear button in the navigation bar.

### Graphical editor

The precision settings define how the numbers written by graphical edits are rounded.

| Setting                                       | Default | Meaning                                                      |
| --------------------------------------------- | ------- | ------------------------------------------------------------ |
| Absolute/relative point translation precision | `1`     | Rounding of `x`/`y` when moving points and elements          |
| Resize precision                              | `1`     | Rounding of `width`/`height` when resizing                   |
| Line point pos precision                      | `0.001` | Rounding of the relative position of a line point            |
| Line point distance precision                 | `0.1`   | Rounding of the distance of a line point to its line         |
| Axis aligned pos precision                    | `0.001` | Rounding of the relative position of an axis-aligned segment |
| Rotation precision                            | `1`     | Rounding of the rotation angle in degrees                    |
| Grid                                          | on      | Show the grid and snap to it                                 |
| Snap to elements/points                       | on      | Snap to other elements, points and gaps                      |

### Theme

The primary color (strokes and text) and the background color can be set separately for light and
dark mode.
They are also available in diagrams as the `primary` and `background`
[style variables](./diagram.md#style-variables), so a diagram which uses them renders correctly in
both modes.
The light/dark toggle of the page switches the diagram along with the documentation.

### Diagram

| Setting         | Default | Meaning                                                                                             |
| --------------- | ------- | --------------------------------------------------------------------------------------------------- |
| Font subsetting | on      | Embed only the glyphs actually used, which makes exported files much smaller                        |
| External fonts  | off     | Allow loading fonts from external URLs, needed for diagrams which use a font from e.g. Google Fonts |

## Diagrams and files

The editor is a progressive web app: it runs completely in the browser, works offline once it has
been loaded, and can be installed like a native application.
No diagram is ever sent to a server.

- **Storage**: diagrams are stored in the browser and are listed in the diagram selection in the
  navigation bar, where they can be created, opened and deleted. The most recently edited diagram is
  opened on start.
- **Files**: a `.hyl` file can be opened from disk, and - in browsers which support it - saved back
  to the same file with `Ctrl` + `S`. If the browser does not support writing files, `Ctrl` + `S`
  downloads the source instead. When installed as an app, HyLiMo can be registered as the handler for
  `.hyl` files.
- **Sharing**: the link button copies a URL which contains the compressed source of the diagram, so
  it can be shared without any server storing it.
- **Export**: the download menu offers SVG, SVG with text converted to paths (for consumers which
  ignore embedded fonts, such as PowerPoint), PDF, and the source file itself.

## Keyboard shortcuts

| Shortcut                                 | Action                                              |
| ---------------------------------------- | --------------------------------------------------- |
| `Ctrl` + `S`                             | Save the diagram, or download the source            |
| `Ctrl` + `Shift` + `E`                   | Download the diagram as SVG                         |
| `Ctrl` + `Z` / `Ctrl` + `Y`              | Undo / redo, in both panes                          |
| `Ctrl` + `Shift` + `F`                   | Fit the diagram to the screen                       |
| `Ctrl` + `Shift` + `C`                   | Center the diagram                                  |
| `Shift` + `Alt` + `F`                    | Format the document                                 |
| `Ctrl` + `Space`                         | Trigger auto-completion                             |
| `Space` + drag, or middle mouse drag     | Pan the canvas                                      |
| `Ctrl` + click                           | Add/remove an element from the selection            |
| Double click, or `Alt` + click           | Reveal the element in the text editor               |
| `Alt` + drag                             | Invert snapping while dragging                      |
| `Shift` + click on a selected connection | Split the connection segment                        |
| `Shift` + drag a line point              | Keep the distance to the line, change only position |

On macOS, use `Cmd` instead of `Ctrl`.
