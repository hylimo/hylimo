import { fun, functionType, id, listType, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the rectangle notation of an actor.
 *
 * UML lets an actor be drawn either as the stick man the `actor` element renders or as a classifier
 * rectangle with the `«actor»` keyword, and the second is what non-human actors - external systems,
 * clocks, sensors - are conventionally drawn as, so that a reader can tell at a glance which of the
 * actors is a person. The two are the same model element and differ in nothing but their notation,
 * so both are associated with a use case in exactly the same way.
 */
export const systemActorModule = ContentModule.create(
    "uml/usecase/systemActor",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/content"
    ],
    [],
    [
        `
            _systemActor = scope.internal.createClassifier(
                "systemActor",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.propertiesAndMethodsContentHandler,
                    scope.internal.contentContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("systemActor"),
                fun(
                    `
                        (name, callback) = args
                        otherKeywords = args.keywords
                        // the keyword is the whole of this notation: without it the rectangle would
                        // be indistinguishable from a class
                        keywords = list("actor")
                        if(otherKeywords != null) {
                            keywords.addAll(otherKeywords)
                        }
                        _systemActor(name, callback, title = name, keywords = keywords, args = args)
                    `,
                    {
                        docs: `
                            Creates a system actor, an actor in the rectangle notation carrying the
                            «actor» keyword. Used for non-human actors, such as external systems.
                        `,
                        params: [
                            [0, "the name of the system actor", stringOrSpanListType],
                            [1, "the function defining the system actor content", optional(functionType)],
                            [
                                "keywords",
                                "the additional keywords of the system actor",
                                optional(listType(stringOrSpanListType))
                            ]
                        ],
                        snippet: `("$1")`,
                        returns: "The created system actor"
                    }
                ),
                object([
                    {
                        name: "Actor/System actor",
                        value: str('systemActor("Example")')
                    }
                ])
            )
    ]
);
