import { fun, id, optional, ParseableExpressions, stringType } from "@hylimo/core";
import { createToolboxEdit, SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * SVG path to draw a stickman with a head, two arms, and two legs.<br>
 * Intended to symbolize a user.
 */
const stickmanIconPath =
    "M 50 10 A 40 40 0 1 1 50 90 A 40 40 0 1 1 50 10 M 0 130 h 100 M 50 90 v 100 M 0 240 L 50 190 M 100 240 L 50 190";

/**
 * Module providing the UML 'actor' function for use-case/sequence diagrams
 */
export const actorModule = ContentModule.create(
    "uml/actor",
    [],
    [],
    [
        `
            scope.internal.createActor = {
                (name) = args
                elements = list()
                if(name != null) {
                    elements += text(contents = list(span(text = name)))
                }
                elements += path(path = "${stickmanIconPath}", stretch = "uniform")

                actorElement = canvasElement(
                    content = rect(
                        content = vbox(contents = elements, inverse = true),
                        class = list("actor")
                    ),
                    class = list("actor-element")
                )

                if(name != null) {
                    scope.internal.registerInDiagramScope(name, actorElement)
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
                    stroke = unset

                    type("text") {
                        hAlign = "center"
                    }
                    type("path") {
                        hAlign = "center"
                    }
                }
                cls("actor-element") {
                    minHeight = 80
                    hAlign = "center"
                }
            }
        `,
        ...actorToolboxEdits(true)
    ]
);

/**
 * Creates toolbox edits for the actor function
 *
 * @param enableDragging whether dragging should be enabled
 * @returns the toolbox edits
 */
export function actorToolboxEdits(enableDragging: boolean): ParseableExpressions {
    return [createToolboxEdit("Actor/Actor", 'actor("Example")', enableDragging)];
}
