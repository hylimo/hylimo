import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing the content content handler (creates a subcanvas if required)
 */
export const contentModule = InterpreterModule.create(
    "uml/classifier/content",
    [],
    [],
    [
        ...parse(
            `
                scope.internal.contentContentHandler = [
                    {
                        args.scope.contents = list()
                    },
                    {
                        this.innerContents = args.scope.contents
                        this.contents = args.contents
                        if (innerContents.length > 0) {
                            contents += path(path = "M 0 0 L 1 0", class = list("separator"))
                            contents += canvas(
                                contents = innerContents,
                                class = list("classifier-canvas")
                            )
                        }
                    }
                ]
            `
        )
    ]
);
