import { bool, booleanType } from "@hylimo/core";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the default name content handler
 */
export const defaultTitleModule = ContentModule.create(
    "uml/classifier/defaultTitle",
    [],
    [],
    `
        scope.internal.defaultTitle = {
            (name, keywords, abstract) = args
            this.contents = list()
            if(keywords != null) {
                keywords.forEach {
                    contents += text(
                        contents = list(span(text = "\\u00AB" + it + "\\u00BB")),
                        class = list("keyword")
                    )
                }
            }
            this.title = list(span(text = name, class = list("title")))
            if ((abstract == true) && scope.internal.config.abstractAsProperty) {
                title += span(text = " {abstract}")
            }
            contents += text(contents = title, class = list("title"))
            vbox(contents = contents, class = list("title-container"))
        }

        scope.internal.defaultTitleContentHandler = [
            { },
            {
                args.contents += scope.internal.defaultTitle(args.args.title, args.args.keywords, args.args.abstract) 
            }
        ]
    `,
    [
        [
            "abstractAsProperty",
            "Whether to show { abstract } after the name of abstract classes",
            booleanType,
            bool(false)
        ]
    ]
);
