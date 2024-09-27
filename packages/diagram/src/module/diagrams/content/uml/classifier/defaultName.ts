import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing the default name content handler
 */
export const defaultNameModule = InterpreterModule.create(
    "uml/classifier/defaultName",
    [],
    [],
    [
        ...parse(
            `
                scope.internal.defaultNameContentHandler = [
                    { },
                    {
                        (name, keywords) = args.args
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
                        args.contents += vbox(contents = contents) 
                    }
                ]
            `
        )
    ]
);
