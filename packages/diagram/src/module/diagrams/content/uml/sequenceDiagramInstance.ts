import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing the UML 'instance' function for sequence diagrams - they differ from normal instances in that they are bottom aligned
 */
export const sequenceDiagramInstanceModule = InterpreterModule.create(
    "uml/sequenceDiagramInstance",
    ["uml/instance"],
    [],
    [
        ...parse(
            `
                scope.styles {
                    cls("instance-element") {
                        vAlign = "bottom"
                    }
                }
            `
        )
    ]
);
