import { fun, id, InterpreterModule, optional, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

const stickmanIconPath =
    "M 50 10 A 40 40 0 1 1 50 90 A 40 40 0 1 1 50 10 M 0 130 h 100 M 50 90 v 100 M 0 240 L 50 190 M 100 240 L 50 190";

/**
 * Module providing the UML 'actor' function for use-case/sequence diagrams
 */
export const actorModule = InterpreterModule.create(
    "uml/actor",
    [],
    [],
    [
        `
        scope.internal.createActor = {
            (name) = args
            elements = list(path(path = "${stickmanIconPath}", stretch = "uniform"))
            if(name != null) {
                elements += text(contents = list(span(text = name)))
            }
            
            actorElement = canvasElement(
                content = rect(
                    content = vbox(contents = elements),
                    class = list("actor")
                ),
                class = list("actor-element")
            )
            
            if(name != null) {
              scope.internal.registerInDiagramScope(name, actorElement)
            }
            
            scope.styles {
              cls("actor") {
                stroke = "unset"
              }
            }
            
            scope.internal.registerCanvasElement(actorElement, args.args, args.args.self)
        }
        `,
        id(SCOPE).assignField(
            "actor",
            fun(
                `
                (name) = args
                scope.internal.createActor(name, args = args)
            `,
                {
                    docs: "Creates an actor.",
                    params: [[0, "the optional name of the actor", optional(stringType)]],
                    snippet: `("$1")`,
                    returns: "The created class"
                }
            )
        ),
        `
            scope.styles {
                cls("actor") {
                    vAlign = "center"
                    type("text") {
                      hAlign = "center"
                    }
                }
                cls("actor-element") {
                    width = 30
                    hAlign = "center"
                }
            }
        `
    ]
);
