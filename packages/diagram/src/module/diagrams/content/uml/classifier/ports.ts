import { fun, functionType, id, object, optional, or } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { LinePointLayoutConfig } from "../../../../../layout/elements/canvas/linePointLayoutConfig.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing helper function to create ports for a classifier
 */
export const portsModule = ContentModule.create(
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
                                        if (isFunction(pos)) {
                                            optionalCallback = pos
                                            pos = null
                                        }
                                        callback = optionalCallback ?? {}
                                        portElement = canvasElement(
                                            class = list("port-element"),
                                            contents = list(rect(class = list("port"))),
                                            pos = canvasScope.lpos(element, pos)
                                        )
                                        portElement.pos.class = list("port-pos")
                                        
                                        result = []
                                        classifierArgs = [null, optionalCallback, args = args]
                                        scope.internal.providesRequiresContentHandler[0](
                                            callScope = result,
                                            args = classifierArgs,
                                            element = portElement,
                                            canvasScope = canvasScope
                                        )
                                        callback.callWithScope(result)
                                        scope.internal.providesRequiresContentHandler[1](
                                            callScope = result,
                                            args = classifierArgs,
                                            element = portElement,
                                            canvasScope = canvasScope
                                        )
                                        
                                        scope.internal.registerCanvasElement(portElement, args, canvasScope)
                                    `,
                                    {
                                        docs: "Creates a port on the outline of the classifier",
                                        params: [
                                            [
                                                0,
                                                "Optional relative position on the outline",
                                                optional(or(LinePointLayoutConfig.POS_TYPE, functionType))
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
                        value: fun(
                            `
                                this.classifierArgs = args.args
                                this.optionalCallback = classifierArgs.args[1]
                                this.element = args.element
                                if(optionalCallback == null) {
                                    element.edits["toolbox/Port/Add port"] = createAppendScopeEdit(
                                        classifierArgs.args,
                                        null,
                                        "'port()'"
                                    )
                                } {
                                    element.edits["toolbox/Port/Add port"] = createAddEdit(
                                        optionalCallback,
                                        "'port()'"
                                    )
                                }
                            `
                        )
                    }
                ])
            ),
        `
            scope.styles {
                cls("port-element") {
                    variables.portSize = 20

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
