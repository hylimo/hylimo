import { assign, fun, id, str, stringType } from "@hylimo/core";
import {
    connectionEditFragments,
    createToolboxEdit,
    PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION,
    SCOPE
} from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing the comment element
 */
export const commentModule = ContentModule.create(
    "uml/comment",
    ["uml/associations"],
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
        `,
        createToolboxEdit("Comment/Comment", 'comment("Example comment")'),
        id(SCOPE)
            .field("internal")
            .field("canvasAddEdits")
            .assignField("connection/comment", str(generateCommentConnectionEdit()))
    ]
);

/**
 * Generates the create connection edit for comments
 * Creates a comment with a connection to the start element
 *
 * @returns the generated connection edit
 */
function generateCommentConnectionEdit(): string {
    const start = connectionEditFragments("start");
    return [
        `'comment("Example comment")'`,
        PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION,
        `'layout{\n    pos = apos('`,
        "end.x & ', ' & end.y",
        "')\n} -- '",
        start.startExpression,
        "' with {\n    over = start('",
        "((end.x - start.x) > 0 ? 0.5 : 0)",
        "').line(end('",
        start.posExpression,
        "'))\n}'",
        PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION
    ].join("&");
}
