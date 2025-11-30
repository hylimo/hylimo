# HyLiMo

HyLiMo is a textual DSL and hybrid editor for efficient modular diagramming.
A deployed web-based version of our editor and documentation can be found at https://hylimo.github.io.
This documentation is still under construction, and thus currently focuses on the usage aspects of the editor.
For technical aspects, we refer to the code documentation.

## Important features

- Hybrid graphical-textual approach
- Live-synced editing
- Graphical edits manipulate the textual definition
- Textual DSL for defining diagrams
- Programming language features, including custom functions and control-flow constructs
- Styling
- Theming
- Modular approach, with initial support for UML class diagrams

## Example diagrams

```hylimo
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

### Class diagram showcasing class, interface, package and comment

<br>

```hylimo
classDiagram {
    package("Automotive") {
        class("Car") {
            private {
                weight : Double
            }
            public {
                startEngine() : void
            }
        } layout {
            pos = apos(-42, 96)
        }

        interface("CarPart") {

        } layout {
            pos = rpos(Car, 450, 0)
        }

        class("CarDoor") {
            private {
                color : Color
            }
        } layout {
            pos = rpos(CarPart, 0, 150)
        }

        Car *-- CarPart with {
            over = start(Position.Right).line(end(Position.Left))
            label("1..*", 0.827, 24.1)
            label("+parts", 0.749, -4.7)
        }

        CarDoor implements CarPart with {
            over = start(Position.Top).line(end(Position.Bottom))
        }

        comment("Drives on roads, and sometimes not on roads") layout {
            width = 177.0234375
            pos = apos(33, 243)
        } .. Car with {
            over = start(0.8015633964429145).line(end(0.19))
        }
    } layout {
        pos = apos(-213, -11)
    }
}
```

### Class diagram for the HyLiMo language server

<br>

```hylimo
classDiagram {
    vdist = 190
    hdist = 450

    class("LanguageServer") layout {
        height = 92.2
        pos = apos(-315.3, -172.5)
    }
    class("DiagramImplementationManager", abstract = true) layout {
        pos = rpos(LanguageServer, 0, vdist * 1.2)
    }

    class("LocalDiagramImplementationManager") layout {
        pos = rpos(DiagramImplementationManager, hdist / -2, vdist)
    }

    class("RemoteDiagramImplementationManager") layout {
        pos = rpos(DiagramImplementationManager, hdist / 2, vdist)
    }

    class("LocalDiagramImplementation") layout {
        pos = rpos(LocalDiagramImplementationManager, 0, vdist)
    }

    class("RemoteDiagramImplementation") layout {
        pos = rpos(RemoteDiagramImplementationManager, 0, vdist)
    }

    class("DiagramImplementation", abstract = true) layout {
        pos = rpos(DiagramImplementationManager, 0, 3 * vdist)
    }

    class("TextDocument") layout {
        pos = rpos(LanguageServer, hdist, 0)
    }

    class("DiagramServerManager") layout {
        pos = rpos(TextDocument, 0, -(vdist))
    }

    class("DiagramServer") layout {
        pos = rpos(DiagramServerManager, hdist, 0)
    }

    class("Diagram") layout {
        pos = rpos(TextDocument, 0, vdist)
    }

    class("DiagramEngine") layout {
        pos = rpos(LanguageServer, -(hdist), vdist / 2)
    }

    class("CompletionEngine") layout {
        pos = rpos(LanguageServer, -(hdist), vdist / -2)
    }

    LanguageServer *--> Diagram with {
        over = start(Position.BottomRight).line(end(Position.Left))
        label("0..*", 0.75, -9.9, 39.1)
    }

    LanguageServer *--> TextDocument with {
        over = start(Position.Right).line(end(Position.Left))
        label("0..*", 0.7, -3.2)
    }

    LanguageServer *--> DiagramImplementationManager with {
        over = start(Position.Bottom).line(end(Position.Top))
        label("1", 0.6, -9.6)
    }

    LocalDiagramImplementationManager extends DiagramImplementationManager with {
        over = start(Position.Top).axisAligned(
            -0.3,
            end(Position.BottomLeft - 0.05)
        )
    }

    RemoteDiagramImplementationManager extends DiagramImplementationManager with {
        over = start(Position.Top).axisAligned(
            -0.3,
            end(Position.BottomRight + 0.05)
        )
    }

    LocalDiagramImplementation extends DiagramImplementation with {
        over = start(Position.Bottom).axisAligned(
            -0.3,
            end(Position.TopLeft + 0.05)
        )
    }

    RemoteDiagramImplementation extends DiagramImplementation with {
        over = start(Position.Bottom).axisAligned(
            -0.3,
            end(Position.TopRight - 0.05)
        )
    }

    DiagramServerManager *--> DiagramServer with {
        over = start(Position.Right).line(end(Position.Left))
        label("0..*", 0.7, -6.3)
    }

    LanguageServer *--> DiagramEngine with {
        over = start(0.375).line(end(0))
        label("1", 0.761, 8.2)
    }

    LanguageServer *--> CompletionEngine with {
        over = start(0.625).line(end(0))
        label("1", 0.8, 5.2)
    }

    LanguageServer *--> DiagramServerManager with {
        over = start(0.875).line(end(Position.Left))
        label("1", 0.882, -5.8)
    }

    DiagramServer !--> Diagram with {
        over = start(Position.Bottom).axisAligned(0, end(Position.Right))
        label("1", 1.0, 19.8)
        label("0..*", 0.363, -23.1)
    }

    LocalDiagramImplementationManager *--> LocalDiagramImplementation with {
        over = start(Position.Bottom).line(end(Position.Top))
        label("{subsets implementations}\n+implementations", 0.56, -109)
        label("0..*", 0.705, 22.6)
    }

    RemoteDiagramImplementationManager *--> RemoteDiagramImplementation with {
        over = start(Position.Bottom).line(end(Position.Top))
        label("{subsets implementations}\n+implementations", 0.56, -107.8)
        label("0..*", 0.705, 23.9)
    }

    Diagram -- DiagramImplementation with {
        over = start(0.2).axisAligned(0, end(Position.Right))
        label("1", 0.3, 11.6)
        label("0..1", 0.976, -25.7)
    }

    DiagramImplementationManager *--> DiagramImplementation with {
        over = start(Position.Bottom).line(end(Position.Top))
        label("+implementations", 0.797, -28.3, -90)
        label("0..*", 0.9, 12.3, -90)
    }

    TextDocument <--! Diagram with {
        over = start(Position.Bottom).line(end(Position.Top))
        label("1", 0.16, -10.1)
        label("1", 0.7, -10.1)
    }
}
```

### Package diagram of HyLiMo

<br>

```hylimo
classDiagram {
    customPackage = {
        name = it
        package("") {
            element {
                text {
                    span(text = name) styles {
                        fontSize = 15
                        fontWeight = "bold"
                    }
                }
            }
        } layout {
            width = 200
        }
    }

    styles {
        cls("package-canvas") {
            variables.subcanvasMargin = 15
            hAlign = HAlign.Center
        }
        cls("title-wrapper") {
            //visibility = Visibility.Collapse
        }
        cls("package") {
            width = 60
            height = 25
        }
        cls("package-element") {
            vAlign = VAlign.Bottom
            hAlign = HAlign.Center
        }
    }

    vdist = 150

    hdist = 300

    top = 0.1608
    left = [4, 0.5]
    right = [2, 0.5]
    bottom = [3, 0.5]

    chevrotain = customPackage("Chevrotaion") styles {
        class += "foreign"
    }

    vscodeLSP = customPackage("vscode-languageserver") styles {
        class += "foreign"
    } layout {
        pos = rpos(chevrotain, 0, 2 * vdist)
    }

    core = customPackage("core") layout {
        pos = rpos(chevrotain, hdist, 0)
    }

    diagram = customPackage("diagram") layout {
        pos = rpos(core, 0, vdist)
    }

    diagramCommon = customPackage("diagram-common") layout {
        pos = rpos(diagram, hdist, 0)
    }

    _fonts = customPackage("fonts") layout {
        pos = rpos(core, hdist, 0)
    }

    languageServer = customPackage("language-server") layout {
        pos = rpos(diagram, 0, vdist)
    }

    diagramProtocol = customPackage("diagram-protocol") layout {
        pos = rpos(languageServer, hdist, 0)
    }

    diagramUI = customPackage("diagram-ui") layout {
        pos = rpos(diagramProtocol, hdist, 0)
    }

    renderPdf = customPackage("diagram-render-pdf") layout {
        pos = rpos(languageServer, 0, vdist)
    }

    renderSvg = customPackage("diagram-render-svg") layout {
        pos = rpos(renderPdf, hdist, 0)
    }

    sprotty = customPackage("sprotty") layout {
        pos = rpos(diagramUI, hdist, 0)
    } styles {
        class += "foreign"
    }

    pdfkit = customPackage("PDFKit") layout {
        pos = rpos(renderPdf, 0, vdist)
    } styles {
        class += "foreign"
    }

    diagram --> core with {
        over = start(top).line(end(bottom))
    }

    diagram --> diagramCommon with {
        over = start(right).line(end(left))
    }

    diagram --> _fonts with {
        over = start(0.2).axisAligned(-0.51, end(bottom))
    }

    renderSvg --> diagramCommon with {
        over = start(right).axisAligned(
            -1,
            rpos(diagramUI, 137, 0),
            0,
            end(right)
        )
    }

    renderPdf --> renderSvg with {
        over = start(right).line(end(left))
    }

    renderPdf --> diagram with {
        over = start(left).axisAligned(
            1,
            rpos(languageServer, -149, 2),
            0,
            end(left)
        )
    }

    languageServer --> diagram with {
        over = start(top).line(end(bottom))
    }

    languageServer --> diagramProtocol with {
        over = start(right).line(end(left))
    }

    diagramUI --> diagramProtocol with {
        over = start(left).line(end(right))
    }

    diagramUI --> diagramCommon with {
        over = start(top).axisAligned(0, end(right))
    }

    languageServer --> vscodeLSP with {
        over = start(left).line(end(right))
    }

    core --> chevrotain with {
        over = start(left).line(end(right))
    }

    renderPdf --> pdfkit with {
        over = start(bottom).line(end(top))
    }

    diagramUI --> sprotty with {
        over = start(right).line(end(left))
    }

    globe = {
        target = it
        element(
            path(
                path = "m210,15v390m195-195H15M59,90a260,260 0 0,0 302,0 m0,240 a260,260 0 0,0-302,0M195,20a250,250 0 0,0 0,382 m30,0 a250,250 0 0,0 0-382 M209,15a195,195 0 1,0 2,0z"
            )
        ) layout {
            pos = rpos(target, 76.80471820620753, -46.57664161215641)
            width = 20
            height = 20
        } styles {
            type("path") {
                stroke = var("primary")
                strokeWidth = 1.5
            }
        }
    }

    globe(diagramUI)
    globe(sprotty)
    styles {
        cls("foreign") {
            any {
                strokeDash = 10
                strokeDashSpace = 5
            }
        }
    }
}
```
