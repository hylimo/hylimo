import { booleanType, fun, functionType, id, listType, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the use case element, the ellipse which is the primary element of a use case
 * diagram.
 *
 * A use case is an ordinary classifier drawn on the ellipse rather than on the rectangle: it carries
 * the same title, the same compartments and the same generalization as a class does, and UML gives it
 * one compartment of its own, the extension points. Nothing here has to make room for the ellipse -
 * the shape reports the largest rectangle that fits inside its own outline, so the title is laid out
 * against the space actually available and the ellipse is grown around it.
 */
export const useCaseModule = ContentModule.create(
    "uml/usecase/useCase",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/usecase/extensionPoints",
        "common/defaultShapes"
    ],
    [],
    [
        `
            _useCase = scope.internal.createClassifier(
                "useCase",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.extensionPointsContentHandler
                ),
                shape = scope.defaultShapes.ellipse
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("useCase"),
                fun(
                    `
                        (name, callback) = args
                        _useCase(
                            name,
                            callback,
                            title = name,
                            keywords = args.keywords,
                            abstract = args.abstract,
                            args = args
                        )
                    `,
                    {
                        docs: "Creates a use case, rendered as an ellipse.",
                        params: [
                            [0, "the name of the use case, rendered inside the ellipse", stringOrSpanListType],
                            [1, "the function defining the use case content", optional(functionType)],
                            ["keywords", "the keywords of the use case", optional(listType(stringOrSpanListType))],
                            ["abstract", "whether the use case is abstract", optional(booleanType)]
                        ],
                        snippet: `("$1")`,
                        returns: "The created use case"
                    }
                ),
                object([
                    {
                        name: "Use case/Use case",
                        value: str('useCase("Example")')
                    },
                    {
                        name: "Use case/Use case with extension points",
                        value: str(
                            `
                                useCase("Example") {
                                    extensionPoints {
                                        ExampleExtensionPoint
                                    }
                                }
                            `
                        )
                    },
                    {
                        name: "Use case/Abstract use case",
                        value: str('useCase("Example", abstract = true)')
                    }
                ])
            ),
        `
            scope.styles {
                cls("useCase-element") {
                    // the ellipse wastes the corners of its bounding box, so the default classifier
                    // width would make even a one word use case a very flat oval
                    minWidth = 160
                    minHeight = 80

                    cls("classifier") {
                        padding = 10
                    }
                    cls("title") {
                        hAlign = "center"
                    }
                }
            }
        `
    ]
);
