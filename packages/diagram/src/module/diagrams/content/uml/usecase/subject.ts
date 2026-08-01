import { assign, fun, functionType, id, listType, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { stringOrSpanListType } from "../../../../base/types.js";

/**
 * Module providing the subject element, the system boundary of a use case diagram.
 *
 * The subject is what the use cases inside it apply to, and drawing them inside it is the whole of
 * that statement - an actor is therefore placed outside, and only the association crosses the
 * boundary. Unlike a package, whose name sits in a tab of its own, the subject carries its name
 * inside the rectangle and is not separated from its contents by a line, so it is a plain rectangle
 * over a title and a subcanvas rather than the two stacked shapes a package is built from.
 */
export const subjectModule = ContentModule.create(
    "uml/usecase/subject",
    ["uml/classifier/defaultTitle", "common/defaultShapes"],
    [],
    [
        assign(
            "_subject",
            fun(
                `
                    (name, optionalCallback, keywords) = args

                    callback = optionalCallback ?? {}
                    result = [contents = list()]
                    callback.callWithScope(result)

                    subjectElement = canvasElement(
                        class = list("subject-element"),
                        contents = list(
                            shape(
                                shape = scope.defaultShapes.rect,
                                class = list("subject"),
                                contents = list(
                                    container(
                                        class = list("subject-container"),
                                        contents = list(
                                            container(
                                                contents = list(scope.internal.defaultTitle(name, keywords)),
                                                class = list("subject-title-wrapper")
                                            ),
                                            canvas(contents = result.contents, class = list("subject-canvas"))
                                        )
                                    )
                                )
                            )
                        )
                    )
                    scope.internal.registerInDiagramScope(name, subjectElement)
                    subjectElement
                `
            )
        ),
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("subject"),
                fun(
                    `
                        (name, callback) = args
                        scope.internal.registerCanvasElement(
                            _subject(name, callback, args.keywords, self = args.self),
                            args,
                            args.self
                        )
                    `,
                    {
                        docs: "Creates a subject, the system boundary the use cases inside it apply to.",
                        params: [
                            [0, "the name of the subject", stringOrSpanListType],
                            [1, "function that initializes the subject content", optional(functionType)],
                            ["keywords", "the keywords of the subject", optional(listType(stringOrSpanListType))]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created subject"
                    }
                ),
                object([
                    {
                        name: "Subject/Subject",
                        value: str('subject("Example")')
                    },
                    {
                        name: "Subject/Subject with use case",
                        value: str(
                            `
                                subject("Example") {
                                    useCase("Example use case")
                                }
                            `
                        )
                    }
                ])
            ),
        `
            scope.styles {
                cls("subject-element") {
                    minWidth = 400

                    cls("subject-container") {
                        layout = "vbox"
                    }
                    cls("subject-title-wrapper") {
                        margin = 10
                    }
                    cls("subject-canvas") {
                        margin = var("subcanvasMargin")
                        minHeight = 150
                        grow = 1
                        shrink = 1
                    }
                    cls("title") {
                        hAlign = "center"
                        type("span") {
                            fontWeight = "bold"
                        }
                    }
                    cls("keyword") {
                        hAlign = "center"
                    }
                }
            }
        `
    ]
);
