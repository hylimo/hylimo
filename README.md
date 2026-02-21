# HyLiMo

HyLiMo is a textual DSL and hybrid editor for efficient modular diagramming.
A deployed web-based version of our editor and documentation can be found at https://hylimo.github.io

## Important features

- hybrid graphical-textual approach
- live-synced editing
- graphical edits manipulate the textual definition
- textual DSL for defining diagrams
- programming language features, including custom functions and control-flow constructs
- styling
- theming
- modular approach, with initial support for UML class diagrams

## Example diagram

```
classDiagram {
    class("Movie")

    class("Actor") layout {
        pos = rpos(Movie, 600, 0)
    }

    Actor -- Movie with {
        over = start(Position.Left).line(end(Position.Right))
    }
}
```

## Gettings started

Setup the project:

```sh
npm install
```

Builing all modules:

```sh
npm run build
```

Depolying the web-based editor:

```
cd website
npm run dev
```

This deploys the website at http://localhost:5173

## Licenses

- @hylimo/cli: [MIT](packages/cli/LICENSE)
- @hylimo/core: [MIT](packages/core/LICENSE)
- @hylimo/diagram: [MIT](packages/diagram/LICENSE)
- @hylimo/diagram-common: [MIT](packages/diagram-common/LICENSE)
- @hylimo/diagram-protocol: [MIT](packages/diagram-protocol/LICENSE)
- @hylimo/diagram-render-pdf: [MIT](packages/diagram-render-pdf/LICENSE)
- @hylimo/diagram-render-svg: [MIT](packages/diagram-render-svg/LICENSE)
- @hylimo/diagram-ui: [EPL-2.0](packages/diagram-ui/LICENSE)
- @hylimo/fonts: [MIT](packages/fonts/LICENSE)
- @hylimo/language-server: [MIT](packages/language-server/LICENSE)
- @hylimo/monaco-editor-support: [MIT](packages/monaco-editor-support/LICENSE)
- @hylimo/wasm-libs: [MIT](packages/wasm-libs/LICENSE)
