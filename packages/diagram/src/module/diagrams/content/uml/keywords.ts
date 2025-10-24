import { fun, id } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module that provides UML keyword rendering functionality.
 */
export const keywordsModule = ContentModule.create(
    "uml/keywords",
    [],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "renderKeywords",
                fun(
                    `
                        (keywords, contents) = args
                        keywords.forEach {
                            this.keyword = it
                            contents += text(
                                contents = if(isString(keyword)) {
                                    list(span(text = "\\u00AB" + keyword + "\\u00BB"))
                                } {
                                    this.keywordParts = list(span(text = "\\u00AB"))
                                    keywordParts.addAll(keyword)
                                    keywordParts += span(text = "\\u00BB")
                                    keywordParts
                                },
                                class = list("keyword")
                            )
                        }
                    `
                )
            )
    ]
);
