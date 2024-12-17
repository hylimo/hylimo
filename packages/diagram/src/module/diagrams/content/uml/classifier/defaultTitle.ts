import { InterpreterModule } from "@hylimo/core";

/**
 * Module providing the default name content handler
 */
export const defaultTitleModule = InterpreterModule.create(
    "uml/classifier/defaultTitle",
    [],
    [],
    `
        scope.internal.defaultTitle = {
            (name, keywords) = args
            this.contents = list()
            if(keywords != null) {
                keywords.forEach {
                    contents += text(
                        contents = list(span(text = "\\u00AB" + it + "\\u00BB")),
                        class = list("keyword")
                    )
                }
            }

            contents += text(contents = list(span(text = name)), class = list("title"))
            vbox(contents = contents, class = list("title-container"))
        }

        scope.internal.defaultTitleContentHandler = [
            { },
            {
                        args.contents += scope.internal.defaultTitle(args.args.title, args.args.keywords) 
            }
        ]
    `
);
