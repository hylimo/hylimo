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
            ),
        id(SCOPE)
            .field("internal")
            .assignField(
                "resolveKeywords",
                fun(
                    `
                        (defaultKeyword, elementArgs) = args
                        this.givenKeyword = elementArgs.keyword
                        this.mainKeyword = if(givenKeyword == null) {
                            defaultKeyword
                        } {
                            if(isBoolean(givenKeyword)) {
                                if(givenKeyword) { defaultKeyword } { null }
                            } {
                                givenKeyword
                            }
                        }
                        this.allKeywords = list()
                        if(mainKeyword != null) {
                            allKeywords += mainKeyword
                        }
                        if(elementArgs.keywords != null) {
                            allKeywords.addAll(elementArgs.keywords)
                        }
                        allKeywords
                    `,
                    {
                        docs: `
                            Computes the keywords of an element: its main keyword, followed by the additional
                            keywords given by the keywords argument of the element.
                            The main keyword is the keyword argument of the element if given, otherwise the
                            default keyword. Setting the keyword argument to false hides the main keyword.
                        `,
                        params: [
                            [0, "the default keyword of the element, null if it has none"],
                            [1, "the arguments the element was created with"]
                        ],
                        returns: "The list of keywords to render"
                    }
                )
            )
    ]
);
