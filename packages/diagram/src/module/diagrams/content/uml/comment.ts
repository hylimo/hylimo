import { assign, fun, id, InterpreterModule, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the comment element
 */
export const commentModule = InterpreterModule.create(
    "uml/comment",
    [],
    [],
    [
        assign(
            "_comment",
            fun(
                `
                    textContent = it
                    commentElement = canvasElement(
                        content = stack(
                            contents = list(
                                path(path = "M0 0 H 1", vAlign = "top", class = list("comment-top")),
                                path(path = "M0 0 H 1", vAlign = "bottom"),
                                path(path = "M0 0 V 1", hAlign = "left"),
                                path(path = "M0 0 V 1", hAlign = "right", class = list("comment-right")),
                                vbox(
                                    contents = list(
                                        path(
                                            path = "M 0 0 V 1 H 1 Z",
                                            hAlign = "right",
                                            vAlign = "top",
                                            class = list("comment-triangle")
                                        ),
                                        text(contents = list(span(text = textContent)), class = list("comment"))
                                    )
                                )
                            )
                        ),
                        class = list("comment-element")
                    )
                    commentElement
                `
            )
        ),
        id(SCOPE).assignField(
            "comment",
            fun(
                `
                    (content) = args
                    scope.internal.registerCanvasElement(
                        _comment(content, self = args.self),
                        args,
                        args.self
                    )
                `,
                {
                    docs: "Creates a comment.",
                    params: [[0, "the content of the comment", stringType]],
                    snippet: `("$1")`,
                    returns: "The created comment"
                }
            )
        ),
        ...parse(
            `
                scope.styles {
                    vars {
                        commentTriangleSize = 20
                    }
                    cls("comment-element") {
                        vAlign = "center"
                        hAlign = "center"
                        minWidth = 80
                        maxWidth = 300

                        cls("comment") {
                            marginRight = 5
                            marginLeft = 5
                            marginBottom = 5
                        }
                        cls("comment-right") {
                            marginTop = var("commentTriangleSize")
                        }
                        cls("comment-top") {
                            marginRight = var("commentTriangleSize")
                        }
                        cls("comment-triangle") {
                            width = var("commentTriangleSize")
                            height = var("commentTriangleSize")
                        }
                        type("path") {
                            stroke = var("primary")
                            strokeWidth = var("strokeWidth")
                        }
                    }
                }
            `
        )
    ]
);
