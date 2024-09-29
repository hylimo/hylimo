import { fun, id, InterpreterModule, numberType, object, optional, parse } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { LinePointLayoutConfig } from "../../../../../layout/elements/canvas/linePointLayoutConfig.js";

/**
 * Module providing helper function to create ports for a classifier
 */
export const portsModule = InterpreterModule.create(
    "uml/classifier/ports",
    ["uml/classifier/providesAndRequires"],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "portsContentHandler",
                object([
                    {
                        value: fun([
                            ...parse(
                                `
                                    this.scope = args.scope
                                    this.canvasScope = args.canvasScope
                                    this.element = args.element
                                    scope.ports = list()
                                `
                            ),
                            id("scope").assignField(
                                "port",
                                fun(
                                    `
                                        (pos, optionalCallback) = args
                                        callback = optionalCallback ?? {}
                                        portElement = canvasElement(
                                            class = list("port-element"),
                                            content = rect(class = list("port")),
                                            pos = canvasScope.lpos(element, pos, args.dist ?? -1)
                                        )
                                        
                                        result = []
                                        scope.internal.providesRequiresContentHandler[0](
                                            scope = result,
                                            args = args,
                                            element = portElement,
                                            canvasScope = canvasScope
                                        )
                                        callback.callWithScope(result)
                                        
                                        scope.internal.registerCanvasElement(portElement, args, canvasScope)
                                    `,
                                    {
                                        docs: "Creates a port on the outline of the classifier",
                                        params: [
                                            [0, "Relative position on the outline", LinePointLayoutConfig.POS_TYPE],
                                            [
                                                "dist",
                                                "Distance from the outline, needs to be adapted if width of outline is not the default value",
                                                optional(numberType)
                                            ]
                                        ],
                                        returns: "The created port element"
                                    }
                                )
                            )
                        ])
                    },
                    {
                        value: fun([])
                    }
                ])
            ),
        ...parse(
            `
                scope.styles {
                    vars {
                        portSize = 20
                    }
                    cls("port-element") {
                        vAlign = "center"
                        hAlign = "center"
                        width = var("portSize")
                        height = var("portSize")
                    }
                }
            `
        )
    ]
);
