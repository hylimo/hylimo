import { fun, functionType, id, listType, object, optional, or, str } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";
import { stringOrSpanListType } from "../../../base/types.js";

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
    ["uml/instance"],
    ["uml/keywords"],
    [
        `
            scope.internal.createActor = {
                (name, keywords) = args
                elements = list(path(path = "${stickmanIconPath}", stretch = "uniform", class = list("actor-icon")))
                if(keywords != null) {
                    scope.internal.renderKeywords(keywords, elements)
                }
                if(name != null) {
                    elements += text(contents = if(isString(name)) {
                        list(span(text = name))
                    } {
                        name
                    })
                }

                actorElement = canvasElement(
                    contents = list(
                        container(
                            contents = elements,
                            class = list("actor")
                        )
                    ),
                    class = list("actor-element")
                )

                if(isString(name)) {
                    scope.internal.registerInDiagramScope(name, actorElement)
                }

                scope.internal.registerCanvasElement(actorElement, args.args, args.args.self)
            }
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("actor"),
                fun(
                    `
                        (name, title, callback) = scope.internal.parseInstanceArgs(args)
                        actorArgs = args
                        
                        if(callback != null) {
                            this.actor = scope.internal.createInstance(name, callback, title = title, keywords = actorArgs.keywords, args = actorArgs)
                            actor.class += "actor-element"
                            this.elements = list(
                                path(path = "${stickmanIconPath}", stretch = "uniform", class = list("actor-icon")),
                                actor.contents[0]
                            )
                            actor.contents = list(
                                container(
                                    contents = elements,
                                    class = list("actor")
                                )
                            )
                            actor
                        } {
                            scope.internal.createActor(title, actorArgs.keywords, args = actorArgs)
                        }
                    `,
                    {
                        docs: "Creates an actor.",
                        params: [
                            [0, "the name of the actor", stringOrSpanListType],
                            [
                                1,
                                "the optional class name of this actor",
                                optional(or(stringOrSpanListType, functionType))
                            ],
                            [2, "the callback function of this actor", optional(functionType)],
                            ["keywords", "the keywords of the actor", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1")`,
                        returns: "The created actor"
                    }
                ),
                object([
                    {
                        name: "Actor/Actor",
                        value: str('actor("Example")')
                    }
                ])
            ),
        `
            scope.styles {
                cls("actor-element") {
                    hAlign = "center"

                    cls("actor") {
                        layout = "vbox"

                        type("text") {
                            hAlign = "center"
                        }
                        cls("actor-icon") {
                            hAlign = "center"
                            base = 60
                            grow = 1
                            shrink = 1
                        }
                    }
                }

                cls("instance-element") {
                    cls("actor-icon") {
                        marginBottom = 5
                    }
                }
            }
        `
    ]
);
