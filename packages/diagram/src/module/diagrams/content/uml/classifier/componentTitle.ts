import { InterpreterModule } from "@hylimo/core";

/**
 * Path to the component icon
 */
const componentIconPath =
    "M 4 0 L 20 0 L 20 20 L 4 20 L 4 16 L 0 16 L 0 12 L 4 12 L 4 8 L 0 8 L 0 4 L 4 4 Z M 4 4 L 8 4 L 8 8 L 4 8 M 4 12 L 8 12 L 8 16 L 4 16";

/**
 * Module providing the component title content handler
 */
export const componentTitleModule = InterpreterModule.create(
    "uml/classifier/componentTitle",
    ["uml/classifier/defaultTitle"],
    [],
    `
        scope.internal.componentTitleContentHandler = [
            { },
            {
                args.contents += stack(
                    contents = list(
                        scope.internal.defaultTitle(args.args.title, args.args.keywords),
                        path(path = "${componentIconPath}", class = list("component-icon"))
                    ),
                    class = list("component-title-container")
                )
            }  
        ]

        scope.styles {
            vars {
                componentIconSize = 25
            }
            cls("component-title-container") {
                cls("title-container") {
                    marginLeft = var("componentIconSize")
                    marginRight = var("componentIconSize")
                }
                cls("component-icon") {
                    width = var("componentIconSize")
                    hAlign = "right"
                    stretch = "uniform"
                    strokeWidth = 1
                }
            }
        }
    `
);
