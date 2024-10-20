import { fun, id, InterpreterModule, listType, optional, stringType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Module providing the UML 'actor' function for sequence diagrams - they differ from normal actors in that
 * - they store the line pointing down
 * - they receive a default position based on the previous elements
 */
export const sequenceDiagramActorModule = InterpreterModule.create(
    "uml/sequenceDiagramActor",
    ["uml/sequence/defaultValues", "uml/actor", "uml/associations"],
    [],
    [
        id(SCOPE).assignField(
            "actor",
            fun(
                `
                    (name, class) = args
                    title = name
                    if(class != null) {
                        title = name + ":" + class
                    }
 
                    this.actor = scope.internal.createActor(name, title = title, keywords = args.keywords, args = args)
 
                    if(scope.internal.lastSequenceDiagramElement != null) {
                        this.actor.pos = scope.rpos(scope.internal.lastSequenceDiagramElement, scope.instanceMargin, 0)
                    }

                    this.bottomcenter = scope.lpos(this.actor, 0.25)
                    this.actor.line = scope[".."](bottomcenter, scope.rpos(bottomcenter, 0, scope.margin))

                    scope.internal.sequenceDiagramTimelines += this.actor.line
                    scope.internal.lastSequenceDiagramElement = this.actor
                `,
                {
                    docs: "Creates an actor. An actor is a stickman with an optional name",
                    params: [
                        [
                            0,
                            "the optional name of the actor. If the next argument is missing, this argument will be treated as the class name",
                            optional(stringType)
                        ],
                        [1, "the optional class name of this actor", optional(stringType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1")`,
                    returns: "The created actor"
                }
            )
        )
        /*  ...parse(
            `
                scope.styles {
                    cls("actor-element") {
                        vAlign = "bottom"
                        minWidth = 50
                    }
                }
            `
        )*/
    ]
);
