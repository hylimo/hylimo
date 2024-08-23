# Hybrid Editor

The hybrid editor is the main interface for creating and editing diagrams.
Its user interface is split into two areas: textual editor, and graphical editor.
General features of the web-based editor include

- Automatic saving of diagrams to the browser's local storage
- Download diagrams using Ctrl + S or the download button
- Download rendered diagrams as SVG or PDF using the download button
- Switch between a dark and light theme

## Textual Editor

The textual editor allows to edit the diagram in a textual way.
As diagrams are stored in a textual format, this is the most direct way to edit them.
It provides the following features:

- Syntax highlighting
- Auto-completion, including documentation
- Error highlighting
- Auto-formatting

In the textual editor, one uses the diagram DSL which is embedded in the programming language SyncScript.

## Graphical Editor

The graphical editor displays the diagram, allows to navigate and manipulate it.
It is live-synced with the textual editor.
It provides the following features:

- Zooming and panning the canvas
- Revealing the textual definition by double click / alt + click on a diagram element
- Multi-selection of elements using ctrl + click
- Moving elements and points using drag and drop
- Resizing diagram elements by dragging its border
- Rotating diagram elements by dragging the rotate symbol
