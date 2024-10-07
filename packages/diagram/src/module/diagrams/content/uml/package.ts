import { assign, fun, functionType, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the package element
 */
export const packageModule = InterpreterModule.create(
    "uml/package",
    ["uml/classifier/defaultTitle"],
    [],
    [
        assign(
            "_package",
            fun(
                `
                    (name, optionalCallback, keywords) = args
    
                    callback = optionalCallback ?? {}
                    result = object(contents = list())
                    callback.callWithScope(result)
    
                    packageElement = canvasElement(
                        class = list("package-element"),
                        content = vbox(
                            contents = list(
                                stack(
                                    contents = list(
                                        rect(content = scope.internal.defaultTitle(name, keywords), class = list("title-wrapper")),
                                        path(path = "M 0 0 V 1", hAlign = "left"),
                                        path(path = "M 0 0 V 1", hAlign = "right"),
                                        path(path = "M 0 0 H 1", vAlign = "top")
                                    ),
                                    class = list("package")
                                ),
                                rect(
                                    content = canvas(contents = result.contents, class = list("package-canvas")),
                                    class = list("package-body")
                                )
                            )
                        )
                    )
                    scope.internal.registerInDiagramScope(name, packageElement)
                    packageElement
                `
            )
        ),
        id(SCOPE).assignField(
            "package",
            fun(
                `
                    (name, callback) = args
                    scope.internal.registerCanvasElement(
                        _package(name, callback, args.keywords, self = args.self),
                        args,
                        args.self
                    )
                `,
                {
                    docs: "Creates a package.",
                    params: [
                        [0, "the name of the package", stringType],
                        [1, "function that initializes the package content", optional(functionType)],
                        ["keywords", "the keywords of the package", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created package"
                }
            )
        ),
        ...parse(
            `
                scope.styles {
                    cls("package-element") {
                        minWidth = 300
                            cls("package-body") {
                            minHeight = 50
                        }
                        cls("package-canvas") {
                            margin = var("subcanvasMargin")
                        }
                        cls("package") {
                            type("vbox") {
                                margin = 5
                            }
                            cls("title-wrapper") {
                                marginLeft = var("strokeWidth")
                                marginRight = var("strokeWidth")
                                marginTop = var("strokeWidth")
                                stroke = unset
                            }
                            minWidth = 100
                            hAlign = "left"
                        }
                        cls("title") {
                            hAlign = "center"
                            type("span") {
                                fontWeight = "bold"
                            }
                        }
                    }
                }
            `
        )
    ]
);
