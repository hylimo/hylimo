import { assign, Expression, fun, id, InterpreterModule, parse, SemanticFieldNames } from "@hylimo/core";

/**
 * Identifier for temporary variable used to safe scope
 */
const scope = "scope";

/**
 * Expressions for the callback provided to generateDiagramEnvironment
 */
const scopeExpressions: Expression[] = [
    assign(scope, id(SemanticFieldNames.IT)),
    assign(
        "_class",
        fun(
            `
                (name, optionalCallback, stereotypes) = args
                callback = optionalCallback ?? {}
                result = object(sections = list())
                result.section = listWrapper {
                    result.sections += it
                }
                callback.callWithScope(result)
                classContents = list()

                if(stereotypes != null) {
                    stereotypes.forEach {
                        classContents += text(
                            contents = list(span(text = "\\u00AB" + it + "\\u00BB")),
                            class = list("stereotype")
                        )
                    }
                }

                classContents += text(contents = list(span(text = name)), class = list("title"))

                result.sections.forEach {
                    classContents += path(path = "M 0 0 L 1 0", class = list("separator"))
                    it.forEach {
                        classContents += text(contents = list(span(text = it)))
                    }
                }

                renderedClass = rect(
                    class = list("class"),
                    content = vbox(contents = classContents)
                )
                classElement = canvasElement(
                    content = renderedClass,
                    scopes = object(default = callback),
                    class = list("class-element")
                )
                targetScope = args.self
                if(targetScope.get(name) == null) {
                    targetScope.set(name, classElement)
                }
                scope.contents += classElement
                classElement
            `
        )
    ),
    ...parse(
        `
            ${scope}.defaultMarkers = object(
                diamond = {
                    marker(
                        content = path(
                            path = "M 18 7 L9 13 L1 7 L9 1 Z",
                            class = list("diamond-marker-path", "marker-path")
                        ),
                        class=list("diamond-marker", "marker"),
                        lineStart = 1
                    )
                },
                filledDiamond = {
                    marker(
                        content = path(
                            path = "M 18 7 L9 13 L1 7 L9 1 Z",
                            class = list("filled-diamond-marker-path", "marker-path", "filled-marker-path")
                        ),
                        class=list("filled-diamond-marker", "marker"),
                        lineStart = 1
                    )
                },
                arrow = {
                    marker(
                        content = path(
                            path = "M 0 0 L 10 6 L 0 12",
                            class = list("arrow-marker-path", "marker-path")
                        ),
                        class=list("arrow-marker", "marker"),
                        lineStart = 0
                    )
                },
                cross = {
                    marker(
                        content = path(
                            path = "M 0 0 L 12 12 M 12 0 L 0 12",
                            class = list("cross-marker-path", "marker-path")
                        ),
                        class=list("cross-marker", "marker"),
                        lineStart = 0
                    )
                },
                triangle = {
                    marker(
                        content = path(
                            path = "M 0 0 L 10 6 L 0 12 Z",
                            class = list("triangle-marker-path", "marker-path")
                        ),
                        class=list("triangle-marker", "marker"),
                        lineStart = 1
                    )
                }
            )
        `
    ),
    ...parse(
        `
            scope.-- = scope.createConnectionOperator()
            scope.--> = scope.createConnectionOperator(
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<-- = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--> = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.!-- = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.cross
            )
            scope.--! = scope.createConnectionOperator(
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope.!--! = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.cross,
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope.!--> = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.cross,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--! = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.cross
            )
            scope.<>-- = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.diamond
            )
            scope.--<> = scope.createConnectionOperator(
                endMarkerFactory = scope.defaultMarkers.diamond
            )
            scope.<>--> = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.diamond,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--<> = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.diamond
            )
            scope.*-- = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.filledDiamond
            )
            scope.--* = scope.createConnectionOperator(
                endMarkerFactory = scope.defaultMarkers.filledDiamond
            )
            scope.*--> = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.filledDiamond,
                endMarkerFactory = scope.defaultMarkers.arrow
            )
            scope.<--* = scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.filledDiamond
            )
            scope.extends = scope.createConnectionOperator(
                endMarkerFactory = scope.defaultMarkers.triangle
            )
            scope.implements = scope.createConnectionOperator(
                endMarkerFactory = scope.defaultMarkers.triangle,
                class = list("dashed-connection")
            )
            scope.set("..", scope.createConnectionOperator(
                class = list("dashed-connection")
            ))
            scope.set("..>", scope.createConnectionOperator(
                endMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            ))
            scope.set("<..", scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            ))
            scope.set("<..>", scope.createConnectionOperator(
                startMarkerFactory = scope.defaultMarkers.arrow,
                endMarkerFactory = scope.defaultMarkers.arrow,
                class = list("dashed-connection")
            ))
        `
    ),
    ...parse(
        `
            scope.class = scope.withRegisterSource [ snippet = "(\\"$1\\") {\\n    $2\\n}" ] {
                (name, callback) = args
                _class(name, callback, args.stereotypes, self = args.self)
            }
            scope.interface = scope.withRegisterSource [ snippet = "(\\"$1\\") {\\n    $2\\n}" ] {
                (name, callback) = args
                stereotypes = list("interface")
                otherStereotypes = args.stereotypes
                if(otherStereotypes != null) {
                    stereotypes.addAll(otherStereotypes)
                }
                _class(name, callback, stereotypes, self = args.self)
            }
        `
    ),
    fun(
        `
            scope.styles {
                vars {
                    primary = if((config ?? object()).theme == "dark") {
                        "#ffffff"
                    } {
                        "#000000"
                    }
                    strokeWidth = 2
                }
                type("span") {
                    fill = var("primary")
                }
                class("class") {
                    stroke = var("primary")
                    strokeWidth = var("strokeWidth")
                    type("vbox") {
                        margin = 5
                    }
                }
                class("title") {
                    hAlign = "center"
                    type("span") {
                        fontWeight = "bold"
                    }
                }
                class("stereotype") {
                    hAlign = "center"
                }
                class("separator") {
                    marginTop = 5
                    marginBottom = 5
                    marginLeft = -5
                    marginRight = -5
                    strokeWidth = var("strokeWidth")
                    stroke = var("primary")
                }
                type("canvasConnection") {
                    stroke = var("primary")
                    strokeWidth = var("strokeWidth")
                }
                class("class-element") {
                    vAlign = "center"
                    hAlign = "center"
                    minWidth = 300
                }
                class("marker") {
                    height = 25
                }
                class("marker-path") {
                    strokeWidth = var("strokeWidth")
                    stroke = var("primary")
                }
                class("filled-marker-path") {
                    fill = var("primary")
                }
                class("dashed-connection") {
                    strokeDash = 10
                }
                class("cross-marker-path") {
                    marginRight = 5
                }
            }
        `
    ).call(id(scope))
];

/**
 * Module for class diagrams
 */
export const classDiagramModule = InterpreterModule.create(
    "class-diagram",
    ["diagram", "dsl"],
    [],
    [assign("classDiagram", id("generateDiagramEnvironment").call(fun(scopeExpressions)))]
);
