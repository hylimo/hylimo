import { fun, functionType, id, InterpreterModule, object, optional } from "@hylimo/core";
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
                            `
                                this.callScope = args.callScope
                                this.canvasScope = args.canvasScope
                                this.element = args.element
                                callScope.ports = list()
                            `,
                            id("callScope").assignField(
                                "port",
                                fun(
                                    `
                                        (pos, optionalCallback) = args
                                        callback = optionalCallback ?? {}
                                        portElement = canvasElement(
                                            class = list("port-element"),
                                            content = rect(class = list("port")),
                                            pos = canvasScope.lpos(element, pos)
                                        )
                                        portElement.pos.class = list("port-pos")
                                        
                                        result = []
                                        scope.internal.providesRequiresContentHandler[0](
                                            callScope = result,
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
                                            [
                                                0,
                                                "Relative position on the outline",
                                                optional(LinePointLayoutConfig.POS_TYPE)
                                            ],
                                            [
                                                1,
                                                "Optional function to define the content of the port",
                                                optional(functionType)
                                            ]
                                        ],
                                        returns: "The created port element"
                                    }
                                )
                            ),
                            `
                                args.element.port = callScope.port
                            `
                        ])
                    },
                    {
                        value: fun([])
                    }
                ])
            ),
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
                    cls("port") {
                        fill = var("background")
                    }
                }
                cls("port-pos") {
                    distance = var("strokeWidth") / -2
                }
            }
        `
    ]
);
