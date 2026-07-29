import { fun, id } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";
import { stringOrSpanListType } from "../../../base/types.js";

/**
 * Module that provides UML keyword rendering functionality.
 */
export const keywordsModule = ContentModule.create(
    "uml/keywords",
    [],
    [],
    [
        id(SCOPE).assignField(
            "keyword",
            fun(
                `
                    (keyword) = args
                    if(isString(keyword)) {
                        list(span(text = "\\u00AB" + keyword + "\\u00BB"))
                    } {
                        this.keywordParts = list(span(text = "\\u00AB"))
                        keywordParts.addAll(keyword)
                        keywordParts += span(text = "\\u00BB")
                        keywordParts
                    }
                `,
                {
                    docs: `
                        Wraps a keyword in guillemets, resulting in a list of spans which can be used
                        everywhere spans are accepted, e.g. as the label of a connection.
                    `,
                    params: [[0, "the keyword to wrap", stringOrSpanListType]],
                    returns: "A list of spans containing the keyword in guillemets"
                }
            )
        ),
        id(SCOPE)
            .field("internal")
            .assignField(
                "renderKeywords",
                fun(
                    `
                        (keywords, contents) = args
                        keywords.forEach {
                            contents += text(contents = scope.keyword(it), class = list("keyword"))
                        }
                    `
                )
            )
    ]
);
