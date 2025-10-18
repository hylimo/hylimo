import { bool, booleanType } from "@hylimo/core";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the default name content handler
 */
export const defaultTitleModule = ContentModule.create(
    "uml/classifier/defaultTitle",
    [],
    ["uml/keywords"],
    `
        scope.internal.defaultTitle = {
            (name, keywords, abstract) = args
            this.contents = list()
            if(keywords != null) {
                scope.internal.renderKeywords(keywords, contents)
            }
            this.title = if(isString(name)) {
                name = list(span(text = name, class = list("title")))
            } {
                name
            }
            if ((abstract == true) && scope.internal.config.abstractAsProperty) {
                title += span(text = " {abstract}")
            }
            contents += text(contents = title, class = list("title"))
            container(contents = contents, class = list("title-container"))
        }

        scope.internal.defaultTitleContentHandler = [
            { },
            {
                args.contents += scope.internal.defaultTitle(args.args.title, args.args.keywords, args.args.abstract) 
            }
        ]

        scope.styles {
            cls("title-container") {
                layout = "vbox"
            }
        }
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
