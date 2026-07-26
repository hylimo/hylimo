import { assign, fun, id, str } from "@hylimo/core";
import {
    createToolboxEditExpression,
    PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION,
    SCOPE
} from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";
import { connectionEditFragments } from "../base/canvasConnection.js";
import { stringOrSpanListType } from "../../../base/types.js";

/**
 * Module providing the comment element, rendered as a note: the folded corner is part of the
 * outline, so connections dock on it and the text is fitted inside the actual silhouette. The
 * minimum height keeps the note taller than twice its (fixed-size) fold, below which the outline
 * would fold back on itself.
 */
export const commentModule = ContentModule.create(
    "uml/comment",
    ["uml/associations", "common/defaultShapes"],
    [],
    [
        assign(
            "_comment",
            fun(
                `
                    this.textContent = it
                    if(isString(textContent)) {
                        textContent = list(span(text = textContent))
                    }
                    commentElement = canvasElement(
                        contents = list(
                            shape(
                                shape = scope.defaultShapes.note,
                                class = list("comment"),
                                contents = list(text(contents = textContent, class = list("comment-text")))
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
                    params: [[0, "the content of the comment", stringOrSpanListType]],
                    snippet: `("$1")`,
                    returns: "The created comment"
                }
            )
        ),
        `
            scope.styles {
                cls("comment-element") {
                    vAlign = "center"
                    hAlign = "center"
                    minWidth = 80
                    minHeight = 46
                    maxWidth = 300

                    cls("comment-text") {
                        margin = 5
                    }
                }
            }
        `,
        createToolboxEditExpression("Comment/Comment", 'comment("Example comment")'),
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
