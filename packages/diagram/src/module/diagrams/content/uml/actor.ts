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
            scope.internal.createActor = {
                canvasElement(
                    content =         vbox(
                        contents = list(
                            path(
                                path = "M 50,10 A 40,40 0 1,1 50,90 A 40,40 0 1,1 50,10 M 0 40 h 120 M 60 0 v 100 M 0 160 L 60 100 M 120 160 L 60 100",
                                stretch = "uniform"
                            )
                        ),
                        class = list("actor")
                    )
                )
            }
            `
        ),
        id(SCOPE).assignField(
            "actor",
            fun(
                `
                    (name, class) = args
                    title = name
                    if(class != null) {
                        title = name + ":" + class
                    }
                    scope.internal.createActor(name, title = title, keywords = args.keywords, args = args)
                `,
                {
                    docs: "Creates an actor.",
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
                    returns: "The created class"
                }
            )
        )
    ]
);
