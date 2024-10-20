import { fun, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the UML 'actor' function for use-case/sequence diagrams
 */
export const actorModule = InterpreterModule.create(
    "uml/actor",
    [],
    [],
    [
        ...parse(
            `
            (name) = args
            scope.internal.createActor = {
                actorElement = canvasElement(
                    content = path(
                        path = "M 50,10 A 40,40 0 1,1 50,90 A 40,40 0 1,1 50,10 M 0 40 h 120 M 60 0 v 100 M 0 160 L 60 100 M 120 160 L 60 100",
                        stretch = "uniform",
                        class = list("actor")
                    ),
                    class = list("actor-element")
                )
                
                if(name != null) {
                  scope.internal.registerInDiagramScope(name, actorElement)
                }
                
                scope.internal.registerCanvasElement(actorElement, args.args, args.args.self)
            }
            `
        ),
        id(SCOPE).assignField(
            "actor",
            fun(
                `
                    (name) = args
                    scope.internal.createActor(name, args = args)
                `,
                {
                    docs: "Creates an actor.",
                    params: [
                        [0, "the optional name of the actor", optional(stringType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1")`,
                    returns: "The created class"
                }
            )
        ),
        ...parse(
            `
                scope.styles {
                    cls("actor") {
                        vAlign = "center"
                    }
                    cls("actor-element") {
                        width = 20
                    }
                }
            `
        )
    ]
);
