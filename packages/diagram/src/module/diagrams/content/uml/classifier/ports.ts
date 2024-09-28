import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing helper function to create ports for a classifier
 */
export const portsModule = InterpreterModule.create(
    "uml/classifier/ports",
    [],
    [],
    [
        ...parse(
            `
                scope.internal.portsContentHandler = [
                    {
                        this.scope = args.scope
                        this.canvasScope = args.args.self
                        this.element = args.element
                        scope.ports = list()
                        args.scope.port = {
                            (pos) = args
                            portElement = canvasElement(
                                class = list("port-element"),
                                content = rect(class = list("port")),
                                pos = canvasScope.lpos(element, pos)
                            )
                            scope.internal.registerCanvasElement(portElement, args, canvasScope)
                        }
                    },
                    { }
                ]

                scope.styles {
                    vars {
                        portSize = 20
                    }
                    cls("port-element") {
                        vAlign = "center"
                        hAlign = "center"
                    }
                    cls("port") {
                        minWidth = var("portSize")
                        minHeight = var("portSize")
                        marginRight = var("strokeWidth")
                    }
                }
            `
        )
    ]
);
